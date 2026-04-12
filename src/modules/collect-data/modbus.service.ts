import 'reflect-metadata';
import ModbusRTU from 'modbus-serial';
import { Injectable, Inject } from '@nestjs/common';
import type { Logger } from 'winston';
import { WINSTON_LOGGER } from '../logger/logger.module';

export interface ModbusReadingModel {
    voltage: number;
    current: number;
    power: number;
    frequency: number;
}

@Injectable()
export class ModbusService {
    private client = new ModbusRTU();

    private portPath: string = '';
    private portBaudRate: number = 9600;
    private slaveId: number = 1;
    private onDataHandler?: (data: ModbusReadingModel) => void;

    private pollTimer: NodeJS.Timeout | null = null;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private isReading = false;
    private closedByUser = false;
    private reconnectEnabled = true;
    private reconnectAttempts = 0;
    private readonly maxReconnectAttempts = Infinity;
    private readonly baseReconnectDelayMs = 1000;
    private readonly maxReconnectDelayMs = 30_000;
    private readonly pollIntervalMs = 1000;

    constructor(@Inject(WINSTON_LOGGER) private readonly logger: Logger) {}

    init(
        port: string,
        baudRate: number,
        slaveId: number,
        onData: (data: ModbusReadingModel) => void,
    ): void {
        this.portPath = port;
        this.portBaudRate = baudRate;
        this.slaveId = slaveId;
        this.onDataHandler = onData;
        this.closedByUser = false;
        this.reconnectEnabled = true;
        this.reconnectAttempts = 0;
        this.logger.info(
            `[ModbusService].init => port='${port}', baudRate=${baudRate}, slaveId=${slaveId}`,
        );
        void this.connectAndStartPolling();
    }

    private async connectAndStartPolling(): Promise<void> {
        try {
            await this.openClient();
            this.reconnectAttempts = 0;
            this.logger.info(
                `[ModbusService].connectAndStartPolling => Connected to '${this.portPath}'.`,
            );
            this.startPolling();
        } catch (err) {
            this.logger.error(
                `[ModbusService].connectAndStartPolling => Connection failed to '${this.portPath}': ${err}`,
            );
            if (!this.closedByUser && this.reconnectEnabled) {
                this.scheduleReconnect();
            }
        }
    }

    private async openClient(): Promise<void> {
        if (this.client.isOpen) {
            return;
        }
        await this.client.connectRTUBuffered(this.portPath, {
            baudRate: this.portBaudRate,
            parity: 'none',
            dataBits: 8,
            stopBits: 1,
        });
        this.client.setID(this.slaveId);
        this.client.setTimeout(1000);
    }

    private closeClient(): void {
        if (!this.client.isOpen) {
            return;
        }
        try {
            this.client.close();
        } catch (err) {
            this.logger.warn(`[ModbusService].closeClient => Error during close: ${err}`);
        }
    }

    private startPolling(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
        this.pollTimer = setInterval(() => {
            void this.pollOnce();
        }, this.pollIntervalMs);
    }

    private stopPolling(): void {
        if (this.pollTimer) {
            clearInterval(this.pollTimer);
            this.pollTimer = null;
        }
    }

    private static readFloat(reg1: number, reg2: number): number {
        const buf = Buffer.alloc(4);
        buf.writeUInt16BE(reg1, 0);
        buf.writeUInt16BE(reg2, 2);
        return buf.readFloatBE(0);
    }

    private async pollOnce(): Promise<void> {
        if (this.isReading || this.closedByUser) {
            return;
        }
        this.isReading = true;
        try {
            const res = await this.client.readHoldingRegisters(0x2000, 16);
            const d = res.data;
            const voltage = ModbusService.readFloat(d[0], d[1]);
            const current = ModbusService.readFloat(d[2], d[3]);
            const powerKw = ModbusService.readFloat(d[4], d[5]);
            const power = powerKw * 1000;
            const frequency = ModbusService.readFloat(d[14], d[15]);

            if (this.onDataHandler) {
                this.onDataHandler({ voltage, current, power, frequency });
            }
        } catch (err) {
            this.logger.error(
                `[ModbusService].pollOnce => Read error on '${this.portPath}': ${err}`,
            );
            this.stopPolling();
            this.closeClient();
            if (!this.closedByUser && this.reconnectEnabled) {
                this.scheduleReconnect();
            }
        } finally {
            this.isReading = false;
        }
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            this.logger.warn(
                `[ModbusService].scheduleReconnect => Timer already active, skipping duplicate scheduling.`,
            );
            return;
        }
        this.reconnectAttempts += 1;
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            this.logger.error(
                `[ModbusService].scheduleReconnect => Max reconnect attempts reached for '${this.portPath}'.`,
            );
            return;
        }
        const delay = Math.min(
            this.baseReconnectDelayMs * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelayMs,
        );
        this.logger.info(
            `[ModbusService].scheduleReconnect => Attempt #${this.reconnectAttempts}/` +
                `${this.maxReconnectAttempts === Infinity ? '∞' : this.maxReconnectAttempts} ` +
                `in ${delay}ms for '${this.portPath}'.`,
        );
        const t = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.closedByUser || !this.reconnectEnabled) {
                this.logger.warn(
                    `[ModbusService].scheduleReconnect => Reconnect cancelled: ` +
                        `closedByUser=${this.closedByUser}, reconnectEnabled=${this.reconnectEnabled}`,
                );
                return;
            }
            void this.connectAndStartPolling();
        }, delay) as unknown as NodeJS.Timeout;
        this.reconnectTimer = t;
        try {
            t?.unref?.();
        } catch (_) {}
    }

    close(): void {
        this.logger.info(
            `[ModbusService].close => Closing '${this.portPath}' and disabling reconnection.`,
        );
        this.closedByUser = true;
        this.reconnectEnabled = false;
        this.stopPolling();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer as unknown as Parameters<typeof clearTimeout>[0]);
            this.reconnectTimer = null;
        }
        void this.closeClient();
    }

    forceReconnect(): void {
        this.logger.warn(
            `[ModbusService].forceReconnect => External reconnect requested for '${this.portPath}'. ` +
                `isConnected=${this.isConnected()}, closedByUser=${this.closedByUser}, ` +
                `reconnectEnabled=${this.reconnectEnabled}, reconnectAttempts=${this.reconnectAttempts}`,
        );
        if (!this.reconnectEnabled || this.closedByUser) {
            this.logger.warn(
                `[ModbusService].forceReconnect => Reconnect disabled or closed by user — skipping.`,
            );
            return;
        }
        this.stopPolling();
        this.closeClient();
        if (!this.closedByUser && this.reconnectEnabled) {
            this.scheduleReconnect();
        }
    }

    isConnected(): boolean {
        return this.client.isOpen;
    }

    getStatus(): string {
        return (
            `ModbusService Status: ` +
            `path='${this.portPath}', ` +
            `isConnected=${this.isConnected()}, ` +
            `closedByUser=${this.closedByUser}, ` +
            `reconnectEnabled=${this.reconnectEnabled}, ` +
            `reconnectAttempts=${this.reconnectAttempts}/` +
            `${this.maxReconnectAttempts === Infinity ? '∞' : this.maxReconnectAttempts}, ` +
            `pollTimer=${this.pollTimer ? 'active' : 'null'}, ` +
            `reconnectTimer=${this.reconnectTimer ? 'active' : 'null'}`
        );
    }

    logStatus(): void {
        this.logger.info(`[STATUS] ${this.getStatus()}`);
    }
}
