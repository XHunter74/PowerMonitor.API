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

    // last time data was received through the parser
    private lastDataReceivedAt: Date | null = null;

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
        this.logger.info(
            `[createAndOpenPort] Called. portPath='${this.portPath}', baudRate=${this.portBaudRate}, ` +
                `hasDataHandler=${!!this.onDataHandler}`,
        );

        if (!this.portPath || !this.portBaudRate || !this.onDataHandler) {
            this.logger.error(
                `[createAndOpenPort] Missing required parameters: portPath=${!!this.portPath}, ` +
                    `baudRate=${!!this.portBaudRate}, onDataHandler=${!!this.onDataHandler}`,
            );
            return;
        }

        this.logger.info(
            `[createAndOpenPort] Creating SerialPort instance for '${this.portPath}'.`,
        );

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
        parser.on('data', (data: string) => {
            this.lastDataReceivedAt = new Date();
            this.onDataHandler(data);
        });

        this.logger.info(`[createAndOpenPort] Port instance created, attaching event listeners.`);

        this.serialPort.on('open', () => {
            if (this.reconnectAttempts > 0) {
                this.logger.info(
                    `Serial port '${this.portPath}' reconnected successfully after ${this.reconnectAttempts} attempt(s).`,
                );
            } else {
                this.logger.info(
                    `Serial port '${this.portPath}' opened at ${this.portBaudRate} b/s.`,
                );
            }
            this.reconnectAttempts = 0;
            this.serialPortOpenSubject.next();
        });

        this.serialPort.on('close', () => {
            this.logger.info(
                `[CLOSE EVENT] Serial port '${this.portPath}' closed. ` +
                    `closedByUser=${this.closedByUser}, reconnectEnabled=${this.reconnectEnabled}, ` +
                    `reconnectAttempts=${this.reconnectAttempts}, reconnectTimer=${this.reconnectTimer ? 'active' : 'null'}`,
            );

            if (this.closedByUser) {
                this.logger.info(
                    `Serial port '${this.portPath}' closed by user - no reconnection.`,
                );
                return;
            }

            this.logger.warn(`Serial port '${this.portPath}' connection lost unexpectedly.`);

            // If closed not by user, try to reconnect (defer scheduling to avoid sync test logs)
            if (this.reconnectEnabled) {
                this.logger.info(
                    `[CLOSE EVENT] Initiating reconnection sequence for '${this.portPath}'.`,
                );
                const t = setTimeout(() => {
                    this.logger.info(
                        `[CLOSE EVENT CALLBACK] Executing deferred reconnect check. ` +
                            `closedByUser=${this.closedByUser}, reconnectEnabled=${this.reconnectEnabled}`,
                    );
                    if (!this.closedByUser && this.reconnectEnabled) {
                        this.scheduleReconnect();
                    } else {
                        this.logger.warn(
                            `[CLOSE EVENT CALLBACK] Reconnect cancelled: closedByUser=${this.closedByUser}, ` +
                                `reconnectEnabled=${this.reconnectEnabled}`,
                        );
                    }
                }, 0) as unknown as NodeJS.Timeout;
                try {
                    t?.unref?.();
                } catch (_) {}
            } else {
                this.logger.info(`[CLOSE EVENT] Reconnection disabled for '${this.portPath}'.`);
            }
        });

        this.serialPort.on('error', (error: any) => {
            const isPortOpen = this.serialPort?.isOpen || false;
            this.logger.error(
                `[ERROR EVENT] Serial port '${this.portPath}' encountered error: ${error}. ` +
                    `isOpen=${isPortOpen}, closedByUser=${this.closedByUser}, reconnectEnabled=${this.reconnectEnabled}, ` +
                    `reconnectAttempts=${this.reconnectAttempts}`,
            );

            // If port is not open, try reconnect (defer scheduling to avoid sync test logs)
            if (!isPortOpen && !this.closedByUser && this.reconnectEnabled) {
                this.logger.warn(
                    `[ERROR EVENT] Connection lost due to error. Initiating reconnection for '${this.portPath}'.`,
                );
                const t = setTimeout(() => {
                    const currentPortOpen = this.serialPort?.isOpen || false;
                    this.logger.info(
                        `[ERROR EVENT CALLBACK] Executing deferred reconnect check. ` +
                            `isOpen=${currentPortOpen}, closedByUser=${this.closedByUser}, reconnectEnabled=${this.reconnectEnabled}`,
                    );
                    if (!currentPortOpen && !this.closedByUser && this.reconnectEnabled) {
                        this.scheduleReconnect();
                    } else {
                        this.logger.warn(
                            `[ERROR EVENT CALLBACK] Reconnect cancelled: isOpen=${currentPortOpen}, ` +
                                `closedByUser=${this.closedByUser}, reconnectEnabled=${this.reconnectEnabled}`,
                        );
                    }
                }, 0) as unknown as NodeJS.Timeout;
                try {
                    t?.unref?.();
                } catch (_) {}
            } else {
                this.logger.info(
                    `[ERROR EVENT] No reconnection needed: isOpen=${isPortOpen}, closedByUser=${this.closedByUser}, ` +
                        `reconnectEnabled=${this.reconnectEnabled}`,
                );
            }
        });

        // attempt to open if port instance exposes open()
        if (typeof this.serialPort.open === 'function') {
            this.logger.info(
                `[createAndOpenPort] Calling serialPort.open() for '${this.portPath}'.`,
            );
            try {
                this.serialPort.open((err: any) => {
                    if (err) {
                        this.logger.error(
                            `[OPEN CALLBACK] Failed to open serial port '${this.portPath}': ${err}. ` +
                                `closedByUser=${this.closedByUser}, reconnectEnabled=${this.reconnectEnabled}`,
                        );
                        if (!this.closedByUser && this.reconnectEnabled) {
                            this.logger.info(
                                `[OPEN CALLBACK] Scheduling reconnect after open failure.`,
                            );
                            const t = setTimeout(() => {
                                this.logger.info(
                                    `[OPEN CALLBACK TIMER] Executing deferred reconnect after open failure.`,
                                );
                                if (!this.closedByUser && this.reconnectEnabled) {
                                    this.scheduleReconnect();
                                }
                            }, 0) as unknown as NodeJS.Timeout;
                            try {
                                t?.unref?.();
                            } catch (_) {}
                        }
                    } else {
                        this.logger.info(
                            `[OPEN CALLBACK] Serial port '${this.portPath}' opened successfully (callback).`,
                        );
                    }
                });
            } catch (err) {
                this.logger.error(
                    `[createAndOpenPort] Exception when opening serial port '${this.portPath}': ${err}`,
                );
                if (!this.closedByUser && this.reconnectEnabled) {
                    this.logger.info(
                        `[createAndOpenPort] Scheduling reconnect after open exception.`,
                    );
                    const t = setTimeout(() => {
                        this.logger.info(
                            `[OPEN EXCEPTION TIMER] Executing deferred reconnect after open exception.`,
                        );
                        if (!this.closedByUser && this.reconnectEnabled) {
                            this.scheduleReconnect();
                        }
                    }, 0) as unknown as NodeJS.Timeout;
                    try {
                        t?.unref?.();
                    } catch (_) {}
                }
            }
        } else {
            this.logger.error(
                `[createAndOpenPort] SerialPort instance does not have an open() method!`,
            );
        }
    }

    private scheduleReconnect() {
        this.logger.info(
            `[scheduleReconnect] Called. reconnectTimer=${this.reconnectTimer ? 'active' : 'null'}, ` +
                `reconnectAttempts=${this.reconnectAttempts}, closedByUser=${this.closedByUser}, ` +
                `reconnectEnabled=${this.reconnectEnabled}`,
        );

        // prevent multiple timers
        if (this.reconnectTimer) {
            this.logger.warn(
                `[scheduleReconnect] Reconnect timer already active, skipping duplicate scheduling.`,
            );
            return;
        }

        this.reconnectAttempts += 1;
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            this.logger.error(
                `[scheduleReconnect] Max reconnect attempts (${this.maxReconnectAttempts}) reached for '${this.portPath}'. Giving up.`,
            );
            return;
        }

        const delay = Math.min(
            this.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelayMs,
        );
        this.logger.info(
            `[scheduleReconnect] Scheduling reconnect attempt #${this.reconnectAttempts}/${this.maxReconnectAttempts === Infinity ? '∞' : this.maxReconnectAttempts} ` +
                `in ${delay} ms for '${this.portPath}'.`,
        );

        const t = setTimeout(() => {
            this.reconnectTimer = null;
            this.logger.info(
                `[RECONNECT TIMER] Executing reconnect attempt #${this.reconnectAttempts} to '${this.portPath}'. ` +
                    `closedByUser=${this.closedByUser}, reconnectEnabled=${this.reconnectEnabled}`,
            );

            // Check again before actually reconnecting
            if (this.closedByUser || !this.reconnectEnabled) {
                this.logger.warn(
                    `[RECONNECT TIMER] Reconnect cancelled: closedByUser=${this.closedByUser}, ` +
                        `reconnectEnabled=${this.reconnectEnabled}`,
                );
                return;
            }

            // cleanup previous listeners and port reference before recreating
            try {
                if (this.serialPort) {
                    this.logger.info(
                        `[RECONNECT TIMER] Cleaning up previous port instance before reconnect.`,
                    );
                    try {
                        this.serialPort.removeAllListeners();
                    } catch (_) {}
                }
            } catch (_) {}

            this.logger.info(
                `[RECONNECT TIMER] Calling createAndOpenPort() for reconnect attempt.`,
            );
            this.createAndOpenPort();
        }, delay) as unknown as NodeJS.Timeout;
        this.reconnectTimer = t as unknown as number;
        try {
            t?.unref?.();
        } catch (_) {}
    }

    constructor(@Inject(WINSTON_LOGGER) private readonly logger: Logger) {}

    initSerial(path: string, baudRate: number, onData: (data: string) => void) {
        this.logger.info(
            `[initSerial] Initializing serial port: path='${path}', baudRate=${baudRate}`,
        );

        // store params for reconnect attempts
        this.portPath = path;
        this.portBaudRate = baudRate;
        this.onDataHandler = onData;
        this.closedByUser = false;
        this.reconnectEnabled = true;
        this.reconnectAttempts = 0;

        this.logger.info(
            `[initSerial] State initialized: closedByUser=${this.closedByUser}, ` +
                `reconnectEnabled=${this.reconnectEnabled}, reconnectAttempts=${this.reconnectAttempts}`,
        );

        // create and open serial port
        this.createAndOpenPort();
    }

    write(data: string) {
        if (this.serialPort?.isOpen) {
            this.serialPort.write(data);
        } else {
            this.logger.warn(
                `Attempted to write to closed serial port '${this.portPath}'. Data: ${data}`,
            );
        }
    }

    close() {
        // Called by user to intentionally close the port. Disable reconnects.
        this.logger.info(`Closing serial port '${this.portPath}' and disabling reconnection.`);
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

    // Status monitoring method for debugging
    getStatus(): string {
        return (
            `SerialPortService Status: ` +
            `path='${this.portPath}', ` +
            `isOpen=${this.isOpen()}, ` +
            `closedByUser=${this.closedByUser}, ` +
            `reconnectEnabled=${this.reconnectEnabled}, ` +
            `reconnectAttempts=${this.reconnectAttempts}/${this.maxReconnectAttempts === Infinity ? '\u221e' : this.maxReconnectAttempts}, ` +
            `reconnectTimer=${this.reconnectTimer ? 'active' : 'null'}, ` +
            `lastDataReceivedAt=${this.lastDataReceivedAt ? this.lastDataReceivedAt.toISOString() : 'never'}`
        );
    }

    logStatus(): void {
        this.logger.info(`[STATUS] ${this.getStatus()}`);
    }

    /**
     * Force a reconnect when the port appears open but data has gone silent.
     * Closing an open port fires the 'close' event which triggers the existing
     * scheduleReconnect() logic. If the port is already closed, reconnect is
     * scheduled directly.
     */
    forceReconnect(): void {
        this.logger.warn(
            `[forceReconnect] External reconnect requested for '${this.portPath}'. ` +
                `isOpen=${this.isOpen()}, closedByUser=${this.closedByUser}, ` +
                `reconnectEnabled=${this.reconnectEnabled}, reconnectAttempts=${this.reconnectAttempts}`,
        );

        if (!this.reconnectEnabled || this.closedByUser) {
            this.logger.warn(
                `[forceReconnect] Reconnect is disabled or port was closed by user — skipping.`,
            );
            return;
        }

        if (this.serialPort?.isOpen) {
            // Closing the port will fire the 'close' event, which calls scheduleReconnect.
            try {
                this.serialPort.close((err: any) => {
                    if (err) {
                        this.logger.error(
                            `[forceReconnect] Error while closing port for reconnect: ${err}. Scheduling reconnect directly.`,
                        );
                        if (!this.closedByUser && this.reconnectEnabled) {
                            this.scheduleReconnect();
                        }
                    }
                });
            } catch (err) {
                this.logger.error(
                    `[forceReconnect] Exception closing port: ${err}. Scheduling reconnect directly.`,
                );
                if (!this.closedByUser && this.reconnectEnabled) {
                    this.scheduleReconnect();
                }
            }
        } else {
            // Port is already closed — schedule reconnect directly.
            this.scheduleReconnect();
        }
    }
}
