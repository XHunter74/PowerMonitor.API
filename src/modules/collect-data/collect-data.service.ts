import 'reflect-metadata';
import { Observable, Subject } from 'rxjs';
import { Injectable, Inject } from '@nestjs/common';
import { Logger } from 'winston';

import { VersionModel } from '../../common/models/version.model';
import { SensorsDataModel } from '../../common/models/sensors-data.model';
import { CoefficientsModel } from '../../common/models/coefficients.model';
import { BoardCoefficientsModel } from '../../common/models/dto/board-coefficients.model';
import { ConfigService } from '../config/config.service';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { TelegramService } from '../messages/telegram.service';
import { SerialDataModel } from '../../common/models/serial-data.model';

import { DataService } from './data.service';
import { SerialPortService } from './serial-port.service';

@Injectable()
export class CollectDataService {
    private lastDataReceiveEvent: Date;
    private serialDataIsAvailable: boolean;

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
    }

    stop() {
        this.serialPortService.close();
    }

    public requestBuildDate() {
        this.serialPortService.write('d\n');
    }

    public requestCoefficients() {
        this.serialPortService.write('i\n');
    }

    public setBoardCoefficients(coefficients: BoardCoefficientsModel) {
        this.logger.debug(
            `[${CollectDataService.name}].${this.setBoardCoefficients.name} => ` +
                `New board coefficients: '${JSON.stringify(coefficients)}'`,
        );
        this.serialPortService.write(
            `s${coefficients.voltageCalibration}:${coefficients.currentCalibration}:` +
                `${coefficients.powerFactorCalibration}\n`,
        );
    }

    private async serialReceiveData(dataStr: string) {
        if (dataStr.startsWith('{') && dataStr.endsWith('}\r')) {
            const data = JSON.parse(dataStr) as SerialDataModel;
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
                    this.logger.debug(
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
                    this.logger.debug(
                        `[${CollectDataService.name}].${this.serialReceiveData.name} => ` +
                            `Board Info: '${JSON.stringify(data)}`,
                    );
                    await this.processBoardVersionData(data.version, data.date);
                    break;
            }
        }
    }

    private async processBoardVersionData(version: string, dateStr: string) {
        const versionData = new VersionModel();
        versionData.buildDate = new Date(dateStr);
        versionData.version = version;
        await this.dataService.processBoardVersionData(versionData);
        if (this.sketchBuildDateSubject) {
            this.sketchBuildDateSubject.next(versionData);
        }
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
        this.sensorsDataSubject.next(sensorData);
        await this.dataService.processVoltageAmperageData(sensorData);
        await this.dataService.processVoltageData(sensorData);
        await this.dataService.processPowerData(sensorData);
    }

    public async checkSerialAvailability() {
        if (!this.serialDataIsAvailable) {
            return;
        }
        const boundaryDate = new Date(Date.now() - 20000);
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

function randomInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
