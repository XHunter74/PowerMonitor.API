import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { Logger } from 'winston';
import { ConfigService } from '../../config/config.service';
import { PowerDataService } from '../power-data/power-data.service';
import { MqttDataModel } from '../../shared/models/mqtt-data.model';
import { EnergyMeteringService } from '../power-data/energy-metering.service';
import { InfoService } from '../info/info.service';
import { CollectDataService } from '../collect-data/collect-data.service';
import { SensorsDataModel } from '../../shared/models/sensors-data.model';
import { MqttConnectionService } from './mqtt-connection.service';
import { daysInMonth } from '../../shared/utils/date-functions';
import { Subscription } from 'rxjs';

@Injectable()
export class MqttClientService {
    private clientSubscription: Subscription;

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly config: ConfigService,
        private readonly powerDataService: PowerDataService,
        private readonly energyMeteringService: EnergyMeteringService,
        private readonly servicesService: InfoService,
        private readonly collectDataService: CollectDataService,
        private readonly mqttConnectionService: MqttConnectionService,
    ) {
        if (config.isDevEnvironment) {
            return;
        }
        this.mqttConnectionService.onConnect(() => {
            this.logger.debug(
                `[${MqttClientService.name}].Constructor => MQTT client is connected`,
            );
        });
        this.mqttConnectionService.onError((error) => {
            this.logger.error(
                `[${MqttClientService.name}].Constructor => MQTT client error: '${JSON.stringify(error)}'`,
            );
        });
        this.clientSubscription = this.collectDataService.getSensorsData.subscribe(
            (data: SensorsDataModel) => {
                this.publishCurrentAndVoltageData(data);
            },
        );
    }

    public async publishPowerData() {
        if (!this.config.isDevEnvironment && this.mqttConnectionService.isConnected()) {
            const options = { retain: true, qos: 1 };
            const data = await this.getMqttData();
            this.mqttConnectionService.publish('tele/tasmota/STATE', JSON.stringify(data), options);
        }
    }

    public publishCurrentAndVoltageData(sensorsData: SensorsDataModel) {
        if (!this.config.isDevEnvironment && this.mqttConnectionService.isConnected()) {
            const options = { retain: true, qos: 1 };
            const data = {
                Current: Math.round(sensorsData.amperage * 10) / 10,
                Voltage: Math.round(sensorsData.voltage),
                Power:
                    Math.round(((sensorsData.voltage * sensorsData.amperage) / 1000) * 100) / 100,
            };
            this.mqttConnectionService.publish('tele/tasmota/STATE', JSON.stringify(data), options);
        }
    }

    private async getMqttData(): Promise<MqttDataModel> {
        const result = new MqttDataModel();
        const today = new Date();
        const todayPowerData = await this.powerDataService.getPowerDataHourly(today, today, {
            suppressLogging: true,
        });
        let power = todayPowerData.reduce((a, b) => a + b.power, 0);
        power = Math.round(power * 100) / 100;
        result.Today = power;
        const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const endDate = new Date(
            today.getFullYear(),
            today.getMonth(),
            daysInMonth(today.getFullYear(), today.getMonth() + 1),
        );
        const dataForMonth = await this.powerDataService.getPowerDataDaily(startDate, endDate, {
            suppressLogging: true,
        });
        power = dataForMonth.reduce((a, b) => a + b.power, 0);
        power = Math.round(power * 100) / 100;
        result.Monthly = power;
        const powerData = await this.energyMeteringService.getCurrentPowerConsumptionData();
        result.PowerData = powerData;
        result.Uptime = this.servicesService.getSystemUptimeSeconds();
        result.SerialState = this.collectDataService.SerialPortState ? 1 : 0;
        return result;
    }

    processApplicationShutdown(signal?: string) {
        this.logger.info(
            `[${MqttClientService.name}].${this.processApplicationShutdown.name} => Start`,
        );
        this.logger.info(
            `[${MqttClientService.name}].${this.processApplicationShutdown.name} => ` +
                `Received shutdown signal: '${signal}'`,
        );
        this.clientSubscription.unsubscribe();
        this.clientSubscription = null;
        this.logger.info(
            `[${MqttClientService.name}].${this.processApplicationShutdown.name} => Finish`,
        );
    }
}
