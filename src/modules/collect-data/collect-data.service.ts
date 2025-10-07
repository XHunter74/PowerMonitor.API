import 'reflect-metadata';
import { Observable, Subject } from 'rxjs';
import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { VersionModel } from '../../shared/models/version.model';
import { SensorsDataModel } from '../../shared/models/sensors-data.model';
import { CoefficientsModel } from '../../shared/models/coefficients.model';
import { BoardCoefficientsModel } from '../../shared/dto/board-coefficients.model';
import { ConfigService } from '../../config/config.service';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { TelegramService } from '../messages/telegram.service';
import { SerialDataModel } from '../../shared/models/serial-data.model';
import { DataService } from './data.service';
import { SerialPortService } from './serial-port.service';
import { delay, randomInt } from '../../shared/utils/utils';
import { Constants } from '../../config/constants';

@Injectable()
export class CollectDataService {
    private lastDataReceiveEvent: Date;
    private serialDataIsAvailable: boolean;
    // --- Added build date tracing state ---
    private lastBuildDateRequest: Date | null = null;
    private buildDateRetryAttempts = 0;
    private buildDateReceived = false;
    private readonly maxBuildDateRetries = 3;
    private readonly buildDateRetryDelayMs = 2000;
    // ---------------------------------------

    private sketchBuildDateSubject = new Subject<VersionModel>();

    get sketchBuildDate(): Observable<VersionModel> {
        return this.sketchBuildDateSubject.asObservable();
    }

    private coefficientsSubject = new Subject<CoefficientsModel>();
    get calibrationCoefficients(): Observable<CoefficientsModel> {
        return this.coefficientsSubject.asObservable();
    }

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
        this.serialPortService.getSerialPortOpen.subscribe(() => {
            void this.processSerialPortOpen();
        });
    }

    stop() {
        this.serialPortService.close();
    }

    private async processSerialPortOpen() {
        this.requestCoefficients();
        await delay(500);
        const newCalibration = new BoardCoefficientsModel();
        newCalibration.voltageCalibration = this.config.voltageCalibration;
        newCalibration.currentCalibration = this.config.currentCalibration;
        newCalibration.powerFactorCalibration = this.config.powerFactorCalibration;
        this.setBoardCoefficients(newCalibration);
        await delay(500);
        this.requestBuildDate(); // initial request now tracked & may retry
    }

    public requestBuildDate(isRetry = false) {
        if (!isRetry) {
            this.buildDateRetryAttempts = 0;
            this.buildDateReceived = false;
        }
        this.lastBuildDateRequest = new Date();
        this.logger.info(
            `[${CollectDataService.name}].${this.requestBuildDate.name} => ` +
                `Sending build date request (attempt ${this.buildDateRetryAttempts + 1}/${this.maxBuildDateRetries})`,
        );
        this.serialPortService.write('d\n');
        this.scheduleBuildDateRetry();
    }

    public requestCoefficients() {
        this.serialPortService.write('i\n');
    }

    public setBoardCoefficients(coefficients: BoardCoefficientsModel) {
        this.logger.info(
            `[${CollectDataService.name}].${this.setBoardCoefficients.name} => ` +
                `New board coefficients: '${JSON.stringify(coefficients)}'`,
        );
        this.serialPortService.write(
            `s${coefficients.voltageCalibration}:${coefficients.currentCalibration}:` +
                `${coefficients.powerFactorCalibration}\n`,
        );
    }

    private scheduleBuildDateRetry() {
        if (this.buildDateReceived) {
            return;
        }
        if (this.buildDateRetryAttempts >= this.maxBuildDateRetries) {
            this.logger.error(
                `[${CollectDataService.name}].${this.scheduleBuildDateRetry.name} => ` +
                    `Build date not received after ${this.maxBuildDateRetries} attempts`,
            );
            return;
        }
        this.buildDateRetryAttempts++;
        setTimeout(() => {
            if (!this.buildDateReceived) {
                this.logger.warn(
                    `[${CollectDataService.name}].${this.scheduleBuildDateRetry.name} => ` +
                        `No build date response yet, retrying (attempt ${this.buildDateRetryAttempts + 1})`,
                );
                this.requestBuildDate(true);
            }
        }, this.buildDateRetryDelayMs);
    }

    private async serialReceiveData(dataStr: string) {
        const raw = dataStr;
        const trimmed = dataStr.trim(); // handles \r, \n, or both
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
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
                            data.power,
                            this.config.powerCoefficient,
                        ),
                    );
                    break;
                case 'coefficients':
                    this.logger.info(
                        `[${CollectDataService.name}].${this.serialReceiveData.name} => ` +
                            `Board Coefficients: '${JSON.stringify(data)}`,
                    );
                    await this.processCalibrationCoefficientsData(
                        data.voltage,
                        data.current,
                        data.powerFactor,
                    );
                    break;
                case 'info':
                    this.logger.info(
                        `[${CollectDataService.name}].${this.serialReceiveData.name} => ` +
                            `Board Info Raw: '${trimmed}'`,
                    );
                    await this.processBoardVersionData(data.version, data.date);
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

    private async processBoardVersionData(version: string, dateStr: string) {
        const versionData = new VersionModel();
        const parsedDate = new Date(dateStr);

        if (isNaN(parsedDate.getTime())) {
            this.logger.error(
                `[${CollectDataService.name}].${this.processBoardVersionData.name} => ` +
                    `Invalid build date string received: '${dateStr}'`,
            );
        }

        versionData.buildDate = parsedDate;
        versionData.version = version;

        await this.dataService.processBoardVersionData(versionData);

        if (this.sketchBuildDateSubject) {
            this.sketchBuildDateSubject.next(versionData);
        }
        this.buildDateReceived = true;
        const latencyMs = this.lastBuildDateRequest
            ? Date.now() - this.lastBuildDateRequest.getTime()
            : -1;

        this.logger.info(
            `[${CollectDataService.name}].${this.processBoardVersionData.name} => ` +
                `Build date received (version='${version}', date='${dateStr}', latency=${latencyMs}ms)`,
        );
    }

    private async processCalibrationCoefficientsData(
        voltage: number,
        current: number,
        powerFactor: number,
    ) {
        const coefficients = new BoardCoefficientsModel();
        coefficients.voltageCalibration = voltage;
        coefficients.currentCalibration = current;
        coefficients.powerFactorCalibration = powerFactor;
        const newCoefficients = new BoardCoefficientsModel();
        newCoefficients.voltageCalibration = this.config.voltageCalibration;
        newCoefficients.currentCalibration = this.config.currentCalibration;
        newCoefficients.powerFactorCalibration = this.config.powerFactorCalibration;
        if (
            newCoefficients.voltageCalibration === coefficients.voltageCalibration &&
            newCoefficients.currentCalibration === coefficients.currentCalibration &&
            newCoefficients.powerFactorCalibration === coefficients.powerFactorCalibration
        ) {
            await this.dataService.processCalibrationCoefficientsData(coefficients);
            if (this.coefficientsSubject) {
                this.coefficientsSubject.next(coefficients);
            }
        } else {
            this.logger.error(
                `[${CollectDataService.name}].${this.processCalibrationCoefficientsData.name} ` +
                    `=> The error happens for setting board coefficients`,
            );
            this.setBoardCoefficients(newCoefficients);
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
        this.sensorsDataSubject.next(sensorData);
        await this.dataService.processVoltageAmperageData(sensorData);
        await this.dataService.processVoltageData(sensorData);
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
        const power = amperage * voltage;
        const data = new SensorsDataModel(voltage, amperage, power, this.config.powerCoefficient);
        return data;
    }
}
