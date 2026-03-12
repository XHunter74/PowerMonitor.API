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

    // connection params stored for reconnects
    private portPath?: string;
    private portBaudRate?: number;
    private onDataHandler?: (data: string) => void;

    // reconnect state
    private reconnectEnabled = true;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = Infinity; // can be changed if needed
    private baseReconnectDelayMs = 1000; // 1s
    private maxReconnectDelayMs = 30_000; // 30s
    private reconnectTimer?: NodeJS.Timeout | number | null;
    private closedByUser = false;

    private serialPortOpenSubject = new Subject<void>();
    get getSerialPortOpen(): Observable<void> {
        return this.serialPortOpenSubject.asObservable();
    }

    private createAndOpenPort() {
        if (!this.portPath || !this.portBaudRate || !this.onDataHandler) return;

        // create port but do not auto open so we can attach listeners first
        this.serialPort = new SerialPort({
            path: this.portPath,
            baudRate: this.portBaudRate,
            autoOpen: false,
        });
        const parser = new ReadlineParser();
        // store parser to allow access in tests
        this.parser = parser;
        this.serialPort.pipe(parser);
        parser.on('data', this.onDataHandler);

        this.serialPort.on('open', () => {
            this.logger.info(`Serial port '${this.portPath}' opened at ${this.portBaudRate} b/s.`);
            this.reconnectAttempts = 0;
            this.serialPortOpenSubject.next();
        });

        this.serialPort.on('close', () => {
            this.logger.info(`Serial port '${this.portPath}' closed.`);
            // If closed not by user, try to reconnect (defer scheduling to avoid sync test logs)
            if (!this.closedByUser && this.reconnectEnabled) {
                const t = setTimeout(() => {
                    if (!this.closedByUser && this.reconnectEnabled) this.scheduleReconnect();
                }, 0) as unknown as NodeJS.Timeout;
                try {
                    t?.unref?.();
                } catch (_) {}
            }
        });

        this.serialPort.on('error', (error: any) => {
            this.logger.error(`Serial port error: ${error}`);
            // If port is not open, try reconnect (defer scheduling to avoid sync test logs)
            if (!this.serialPort?.isOpen && !this.closedByUser && this.reconnectEnabled) {
                const t = setTimeout(() => {
                    if (!this.serialPort?.isOpen && !this.closedByUser && this.reconnectEnabled)
                        this.scheduleReconnect();
                }, 0) as unknown as NodeJS.Timeout;
                try {
                    t?.unref?.();
                } catch (_) {}
            }
        });

        // attempt to open if port instance exposes open()
        if (typeof this.serialPort.open === 'function') {
            try {
                this.serialPort.open((err: any) => {
                    if (err) {
                        this.logger.error(`Failed to open serial port '${this.portPath}': ${err}`);
                        if (!this.closedByUser && this.reconnectEnabled) {
                            const t = setTimeout(() => {
                                if (!this.closedByUser && this.reconnectEnabled) {
                                    this.scheduleReconnect();
                                }
                            }, 0) as unknown as NodeJS.Timeout;
                            try {
                                t?.unref?.();
                            } catch (_) {}
                        }
                    }
                });
            } catch (err) {
                this.logger.error(`Exception when opening serial port '${this.portPath}': ${err}`);
                if (!this.closedByUser && this.reconnectEnabled) {
                    const t = setTimeout(() => {
                        if (!this.closedByUser && this.reconnectEnabled) this.scheduleReconnect();
                    }, 0) as unknown as NodeJS.Timeout;
                    try {
                        t?.unref?.();
                    } catch (_) {}
                }
            }
        }
    }

    private scheduleReconnect() {
        // prevent multiple timers
        if (this.reconnectTimer) return;

        this.reconnectAttempts += 1;
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            this.logger.warn(
                `Max reconnect attempts (${this.maxReconnectAttempts}) reached for '${this.portPath}'.`,
            );
            return;
        }

        const delay = Math.min(
            this.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelayMs,
        );
        this.logger.info(
            `Scheduling reconnect attempt #${this.reconnectAttempts} in ${delay} ms for '${this.portPath}'.`,
        );

        const t = setTimeout(() => {
            this.reconnectTimer = null;
            this.logger.info(
                `Attempting reconnect #${this.reconnectAttempts} to '${this.portPath}'.`,
            );
            // cleanup previous listeners and port reference before recreating
            try {
                if (this.serialPort) {
                    try {
                        this.serialPort.removeAllListeners();
                    } catch (_) {}
                }
            } catch (_) {}
            this.createAndOpenPort();
        }, delay) as unknown as NodeJS.Timeout;
        this.reconnectTimer = t as unknown as number;
        try {
            t?.unref?.();
        } catch (_) {}
    }

    constructor(@Inject(WINSTON_LOGGER) private readonly logger: Logger) {}

    initSerial(path: string, baudRate: number, onData: (data: string) => void) {
        // store params for reconnect attempts
        this.portPath = path;
        this.portBaudRate = baudRate;
        this.onDataHandler = onData;
        this.closedByUser = false;
        this.reconnectEnabled = true;
        this.reconnectAttempts = 0;

        // create and open serial port
        this.createAndOpenPort();
    }

    write(data: string) {
        if (this.serialPort?.isOpen) {
            this.serialPort.write(data);
        }
    }

    close() {
        // Called by user to intentionally close the port. Disable reconnects.
        this.closedByUser = true;
        this.reconnectEnabled = false;

        // clear any scheduled reconnect
        try {
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer as any);
                this.reconnectTimer = null;
            }
        } catch (_) {}

        if (this.serialPort) {
            try {
                if (this.serialPort.isOpen) {
                    this.serialPort.close((err: any) => {
                        if (err) this.logger.error(`Error closing serial port: ${err}`);
                    });
                }
                try {
                    this.serialPort.removeAllListeners();
                } catch (_) {}
            } catch (err) {
                this.logger.error(`Exception during serial port close: ${err}`);
            }
        }
    }

    isOpen(): boolean {
        return this.serialPort?.isOpen || false;
    }
}
