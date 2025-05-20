import { CollectDataService } from './collect-data.service';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_LOGGER } from '../modules/logger.module';
import { Logger } from 'winston';
import { WebSocketGateway, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, WebSocketServer } from '@nestjs/websockets';
import { SensorsData } from '../models/sensors-data';
import { Subscription } from 'rxjs';

@WebSocketGateway()
export class SocketService implements OnGatewayConnection, OnGatewayDisconnect {

    private clients: number = 0;
    @WebSocketServer() server;
    private clientSubscription: Subscription;

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly collectDataService: CollectDataService,
    ) { }

    async handleConnection(client) {
        this.logger.info(`[${SocketService.name}].${this.handleConnection.name} => ` +
            `Client '${client.id}' connected.`);
        this.clients++;
    }

    async handleDisconnect(client) {
        this.logger.info(`[${SocketService.name}].${this.handleDisconnect.name} => ` +
            `Client '${client.id}' disconnected.`);
        if (this.clients >= 1) {
            this.clients--;
        }
        if (this.clients <= 0 && this.clientSubscription && !this.clientSubscription.closed) {
            this.logger.info(`[${SocketService.name}].${this.handleDisconnect.name} => ` +
                `All clients was disconnected so closed subscription to getting sensors data.`);
            this.clientSubscription.unsubscribe();
            this.clientSubscription = null;
        }
    }

    @SubscribeMessage('sensors-data')
    async onSensorsData(client) {
        // this.logger.info(`[${SocketService.name}].${this.onSensorsData.name} => ` +
        //     `Client '${client.id}' requested sensors data.`);
        if (!this.clientSubscription) {
            this.clientSubscription = this.collectDataService.getSensorsData.subscribe((data: SensorsData) => {
                this.server.emit('sensors-data', data);
            });
        }
    }

    @SubscribeMessage('close-sensors-data')
    async onCloseSensorsData(client) {
        this.logger.info(`[${SocketService.name}].${this.onCloseSensorsData.name} => ` +
            `Client '${client.id}' requested close sensors data channel.`);
    }
}
