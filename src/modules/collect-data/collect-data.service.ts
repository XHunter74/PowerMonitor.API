import 'reflect-metadata';
import { Observable, Subject } from 'rxjs';
import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { SensorsDataModel } from '../../shared/models/sensors-data.model';
import { ConfigService } from '../../config/config.service';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { TelegramService } from '../messages/telegram.service';
import { SerialDataModel } from '../../shared/models/serial-data.model';
import { DataService } from './data.service';
import { SerialPortService } from './serial-port.service';
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
        private readonly serialPortService: SerialPortService,
    ) {
        this.lastDataReceiveEvent = new Date();
        this.serialDataIsAvailable = true;
    }

    start() {
        this.serialPortService.initSerial(
            this.config.serialPortName,
            this.config.serialPortSpeed,
            (data: string) => {
                void this.serialReceiveData(data);
            },
        );
    }

    stop() {
        this.serialPortService.close();
    }

    private async serialReceiveData(dataStr: string) {
        const raw = dataStr;
        const trimmed = dataStr.trim(); // handles \r, \n, or both
        const countOfBraces = trimmed.split('"').length - 1;
        const isCorrectJsonStr =
            trimmed.startsWith('{') && trimmed.endsWith('}') && countOfBraces % 2 === 0;

        if (isCorrectJsonStr) {
            let data = null;
            try {
                data = JSON.parse(trimmed) as SerialDataModel;
            } catch (err) {
                this.logger.error(
                    `[${CollectDataService.name}].${this.serialReceiveData.name} => ` +
                        `Error parsing serial JSON: '${raw.replace(/\r|\n/g, '\\n')}' - ${err}`,
                );
                return;
            }
            this.lastDataReceiveEvent = new Date();
            this.serialDataIsAvailable = true;
            switch (data.type) {
                case 'data':
                    await this.processSensorData(
                        new SensorsDataModel(
                            data.voltage,
                            data.current,
                            this.config.powerCoefficient,
                        ),
                    );
                    break;
                default:
                    this.logger.warn(
                        `[${CollectDataService.name}].${this.serialReceiveData.name} => ` +
                            `Unknown data.type='${data.type}' Raw='${trimmed}'`,
                    );
                    break;
            }
        } else {
            // Non-JSON line (could be noise / boot messages)
            this.logger.debug(
                `[${CollectDataService.name}].${this.serialReceiveData.name} => ` +
                    `Ignoring non-JSON line: '${raw.replace(/\r|\n/g, '\\n')}'`,
            );
        }
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
            this.serialPortService.logStatus();
            this.serialPortService.forceReconnect();
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
        const data = new SensorsDataModel(voltage, amperage, this.config.powerCoefficient);
        return data;
    }
}
