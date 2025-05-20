import 'reflect-metadata';
import { SerialPort, ReadlineParser } from 'serialport';
import { DataService } from './data.service';
import { Observable, Subject } from 'rxjs';
import { Injectable, Inject } from '@nestjs/common';
import { VersionModel } from '../models/version.model';
import { SensorsData } from '../models/sensors-data';
import { CoefficientsModel } from '../models/coefficients.model';
import { BoardCoefficientsModel } from '../models/board-coefficients.model';
import { ConfigService } from './config.service';
import { WINSTON_LOGGER } from '../modules/logger.module';
import { Logger } from 'winston';
import { TelegramService } from './telegram.service';
import { SerialData } from '../models/serial-data';
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

  private sensorsDataSubject = new Subject<SensorsData>();
  get getSensorsData(): Observable<SensorsData> {
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

  async start() {
    await this.serialPortService.initSerial(
      this.config.SerialPortName,
      this.config.SerialPortSpeed,
      async (data: string) => this.serialReceiveData(data),
    );
  }

  async stop() {
    await this.serialPortService.close();
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
      `s${coefficients.voltageCalibration}:${coefficients.currentCalibration}:${coefficients.powerFactorCalibration}\n`,
    );
  }

  private async serialReceiveData(dataStr: string) {
    if (dataStr.startsWith('{') && dataStr.endsWith('}\r')) {
      const data = JSON.parse(dataStr) as SerialData;
      this.lastDataReceiveEvent = new Date();
      this.serialDataIsAvailable = true;
      switch (data.type) {
        case 'data':
          await this.processSensorData(
            new SensorsData(data.voltage, data.current, data.power, this.config.PowerCoefficient),
          );
          break;
        case 'coefficients':
          this.logger.debug(
            `[${CollectDataService.name}].${this.serialReceiveData.name} => ` +
              `Board Coefficients: '${JSON.stringify(data)}`,
          );
          await this.processCalibrationCoefficientsData(data.voltage, data.current, data.powerFactor);
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

  private async processCalibrationCoefficientsData(voltage: number, current: number, powerFactor: number) {
    const coefficients = new BoardCoefficientsModel();
    coefficients.voltageCalibration = voltage;
    coefficients.currentCalibration = current;
    coefficients.powerFactorCalibration = powerFactor;
    const newCoefficients = new BoardCoefficientsModel();
    newCoefficients.voltageCalibration = this.config.VoltageCalibration;
    newCoefficients.currentCalibration = this.config.CurrentCalibration;
    newCoefficients.powerFactorCalibration = this.config.PowerFactorCalibration;
    if (newCoefficients.voltageCalibration === coefficients.voltageCalibration &&
      newCoefficients.currentCalibration === coefficients.currentCalibration &&
      newCoefficients.powerFactorCalibration === coefficients.powerFactorCalibration) {
      await this.dataService.processCalibrationCoefficientsData(coefficients);
      if (this.coefficientsSubject) {
        this.coefficientsSubject.next(coefficients);
      }
    } else {
      this.logger.error(`[${CollectDataService.name}].${this.processCalibrationCoefficientsData.name} => ` +
        'The error happens for setting board coefficients');
      this.setBoardCoefficients(newCoefficients);
    }
  }

  private async processSensorData(sensorData: SensorsData) {
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
      this.logger.error(`[${CollectDataService.name}].${this.checkSerialAvailability.name} => ` +
        'Serial Data is not available');
      if (!this.config.IsDevEnvironment) {
        await this.telegramService.sendTelegramMessage('PowerMonitor Serial Data Is Not Available');
      }
    }
  }

  private getFakePowerData(): SensorsData {
    const amperage = randomInt(0, 100) / 10;
    const voltage = randomInt(2000, 2500) / 10;
    const power = amperage * voltage;
    const data = new SensorsData(voltage, amperage, power, this.config.PowerCoefficient);
    return data;
  }
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
