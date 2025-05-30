import { CollectDataService } from '../collect-data/collect-data.service';
import { Inject } from '@nestjs/common';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { Logger } from 'winston';
import {
    WebSocketGateway,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketServer,
} from '@nestjs/websockets';
import { SensorsDataModel } from '../../shared/models/sensors-data.model';
import { Subscription } from 'rxjs';

@WebSocketGateway()
export class SocketService implements OnGatewayConnection, OnGatewayDisconnect {
    private clients: number = 0;
    @WebSocketServer() server;
    private clientSubscription: Subscription;

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly collectDataService: CollectDataService,
    ) {}

    handleConnection(client) {
        this.logger.info(
            `[${SocketService.name}].${this.handleConnection.name} => ` +
                `Client '${client.id}' connected.`,
        );
        this.clients++;
    }

    handleDisconnect(client) {
        this.logger.info(
            `[${SocketService.name}].${this.handleDisconnect.name} => ` +
                `Client '${client.id}' disconnected.`,
        );
        if (this.clients >= 1) {
            this.clients--;
        }
        if (this.clients <= 0 && this.clientSubscription && !this.clientSubscription.closed) {
            this.logger.info(
                `[${SocketService.name}].${this.handleDisconnect.name} => ` +
                    `All clients was disconnected so closed subscription to getting sensors data.`,
            );
            this.clientSubscription.unsubscribe();
            this.clientSubscription = null;
        }
    }

    @SubscribeMessage('sensors-data')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onSensorsData(client) {
        if (!this.clientSubscription) {
            this.clientSubscription = this.collectDataService.getSensorsData.subscribe(
                (data: SensorsDataModel) => {
                    this.server.emit('sensors-data', data);
                },
            );
        }
    }

    @SubscribeMessage('close-sensors-data')
    onCloseSensorsData(client) {
        this.logger.info(
            `[${SocketService.name}].${this.onCloseSensorsData.name} => ` +
                `Client '${client.id}' requested close sensors data channel.`,
        );
    }
}
