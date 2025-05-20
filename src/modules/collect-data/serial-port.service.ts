import { Inject, Injectable } from '@nestjs/common';
import { SerialPort, ReadlineParser } from 'serialport';
import { WINSTON_LOGGER } from '../logger/logger.module';
import type { Logger } from 'winston';

@Injectable()
export class SerialPortService {
  private serialPort: any;

  constructor(
    @Inject(WINSTON_LOGGER) private readonly logger: Logger
  ) {}

  async initSerial(path: string, baudRate: number, onData: (data: string) => void) {
    this.serialPort = new SerialPort({ path, baudRate });
    const parser = new ReadlineParser();
    this.serialPort.pipe(parser);
    parser.on('data', onData);

    this.serialPort.on('open', () => this.logger.info(`Serial port '${path}' opened at ${baudRate} b/s.`));
    this.serialPort.on('close', () => this.logger.info(`Serial port '${path}' closed.`));
    this.serialPort.on('error', (error: any) => this.logger.error(`Serial port error: ${error}`));
  }

  async write(data: string) {
    if (this.serialPort?.isOpen) {
      this.serialPort.write(data);
    }
  }

  async close() {
    if (this.serialPort?.isOpen) {
      this.serialPort.close();
    }
  }

  isOpen(): boolean {
    return this.serialPort?.isOpen || false;
  }
}