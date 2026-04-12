import 'reflect-metadata';
import { Observable, Subject } from 'rxjs';
import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { SensorsDataModel } from '../../shared/models/sensors-data.model';
import { ConfigService } from '../../config/config.service';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { TelegramService } from '../messages/telegram.service';
import { DataService } from './data.service';
import { ModbusService, ModbusReadingModel } from './modbus.service';
import { randomInt } from '../../shared/utils/utils';
import { Constants } from '../../config/constants';

@Injectable()
export class CollectDataService {
    private lastDataReceiveEvent: Date;
    private serialDataIsAvailable: boolean;

    private sensorsDataSubject = new Subject<SensorsDataModel>();
    get getSensorsData(): Observable<SensorsDataModel> {
        return this.sensorsDataSubject.asObservable();
    }

    get SerialPortState(): boolean {
        return this.serialDataIsAvailable;
    }

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly config: ConfigService,
        private readonly dataService: DataService,
        private readonly telegramService: TelegramService,
        private readonly modbusService: ModbusService,
    ) {
        this.lastDataReceiveEvent = new Date();
        this.serialDataIsAvailable = true;
    }

    start() {
        this.modbusService.init(
            this.config.serialPortName,
            this.config.serialPortSpeed,
            this.config.slaveId,
            (data: ModbusReadingModel) => {
                void this.modbusDataReceived(data);
            },
        );
    }

    stop() {
        this.modbusService.close();
    }

    private async modbusDataReceived(data: ModbusReadingModel) {
        this.lastDataReceiveEvent = new Date();
        this.serialDataIsAvailable = true;
        await this.processSensorData(
            new SensorsDataModel(
                data.voltage,
                data.current,
                data.power,
                data.frequency,
                this.config.powerCoefficient,
            ),
        );
    }

    private async processSensorData(sensorData: SensorsDataModel) {
        if (sensorData.voltage > Constants.MaxVoltage) {
            this.logger.error(
                `[${CollectDataService.name}].${this.processSensorData.name} => ` +
                    `Voltage is too high: ${sensorData.voltage}V`,
            );
            return;
        }
        if (sensorData.amperage > Constants.MaxAmperage) {
            this.logger.error(
                `[${CollectDataService.name}].${this.processSensorData.name} => ` +
                    `Amperage is too high: ${sensorData.amperage}A`,
            );
            return;
        }
        if (
            (sensorData.voltage === 0 && sensorData.amperage > 0) ||
            (sensorData.voltage > 0 && sensorData.amperage === 0)
        ) {
            this.logger.error(
                `[${CollectDataService.name}].${this.processSensorData.name} => ` +
                    `Invalid sensor data: Voltage=${sensorData.voltage}V, Amperage=${sensorData.amperage}A`,
            );
            return;
        }
        this.sensorsDataSubject.next(sensorData);
        await this.dataService.processVoltageAmperageData(sensorData);
        // await this.dataService.processVoltageData(sensorData);
        await this.dataService.processPowerData(sensorData);
    }

    public async checkSerialAvailability() {
        if (!this.serialDataIsAvailable) {
            return;
        }
        const boundaryDate = new Date(Date.now() - Constants.SerialDataTimeout);
        if (boundaryDate > this.lastDataReceiveEvent) {
            this.serialDataIsAvailable = false;
            this.logger.error(
                `[${CollectDataService.name}].${this.checkSerialAvailability.name} => ` +
                    'Serial Data is not available',
            );
            this.modbusService.logStatus();
            this.modbusService.forceReconnect();
            if (!this.config.isDevEnvironment) {
                await this.telegramService.sendTelegramMessage(
                    'PowerMonitor Serial Data Is Not Available',
                );
            }
        }
    }

    private getFakePowerData(): SensorsDataModel {
        const amperage = randomInt(0, 100) / 10;
        const voltage = randomInt(2000, 2500) / 10;
        const power = voltage * amperage;
        const data = new SensorsDataModel(
            voltage,
            amperage,
            power,
            50,
            this.config.powerCoefficient,
        );
        return data;
    }
}
