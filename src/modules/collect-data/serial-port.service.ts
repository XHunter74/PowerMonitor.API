import { Inject, Injectable } from '@nestjs/common';
// Use require for serialport to enable runtime mocking
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serialport = require('serialport');
const SerialPort = serialport.SerialPort;
const ReadlineParser = serialport.ReadlineParser;
import { WINSTON_LOGGER } from '../logger/logger.module';
import type { Logger } from 'winston';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class SerialPortService {
    private serialPort: any;
    // Expose parser instance for testing purposes
    private parser: any;

    private serialPortOpenSubject = new Subject<void>();
    get getSerialPortOpen(): Observable<void> {
        return this.serialPortOpenSubject.asObservable();
    }

    constructor(@Inject(WINSTON_LOGGER) private readonly logger: Logger) {}

    initSerial(path: string, baudRate: number, onData: (data: string) => void) {
        this.serialPort = new SerialPort({ path, baudRate });
        const parser = new ReadlineParser();
        // store parser to allow access in tests
        this.parser = parser;
        this.serialPort.pipe(parser);
        parser.on('data', onData);

        this.serialPort.on('open', () => {
            this.logger.info(`Serial port '${path}' opened at ${baudRate} b/s.`);
            this.serialPortOpenSubject.next();
        });
        this.serialPort.on('close', () => this.logger.info(`Serial port '${path}' closed.`));
        this.serialPort.on('error', (error: any) =>
            this.logger.error(`Serial port error: ${error}`),
        );
    }

    write(data: string) {
        if (this.serialPort?.isOpen) {
            this.serialPort.write(data);
        }
    }

    close() {
        if (this.serialPort?.isOpen) {
            this.serialPort.close();
        }
    }

    isOpen(): boolean {
        return this.serialPort?.isOpen || false;
    }
}
