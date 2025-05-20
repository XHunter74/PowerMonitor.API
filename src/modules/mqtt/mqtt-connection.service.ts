import { Inject, Injectable } from '@nestjs/common';
import { connect, MqttClient, IClientOptions } from 'mqtt';
import { ConfigService } from '../config/config.service';
import { Logger } from 'winston';
import { WINSTON_LOGGER } from '../logger/logger.module';

@Injectable()
export class MqttConnectionService {
  private client: MqttClient;

  constructor(
    @Inject(WINSTON_LOGGER) private readonly logger: Logger,
    config: ConfigService
  ) {
    const options: IClientOptions = {
      host: config.mqttServer,
      port: config.mqttPort,
      protocol: 'mqtt',
      username: config.mqttUser,
      password: config.mqttPassword,
      clientId: config.mqttClient,
    };

    this.client = connect(options);

    this.client.on('connect', () => {
      this.logger.info(`[${MqttConnectionService.name}] => Connected to MQTT broker`);
    });

    this.client.on('error', (error) => {
      this.logger.error(`[${MqttConnectionService.name}] => MQTT connection error: ${error.message}`);
    });

    this.client.on('close', () => {
      this.logger.info(`[${MqttConnectionService.name}] => MQTT connection closed`);
    });
  }

  public onConnect(callback: () => void): void {
    this.client.on('connect', callback);
  }

  public onError(callback: (error: Error) => void): void {
    this.client.on('error', callback);
  }

  public isConnected(): boolean {
    return this.client.connected;
  }

  public publish(topic: string, message: string, options?: Record<string, any>): void {
    if (this.isConnected()) {
      this.client.publish(topic, message, options, (error) => {
        if (error) {
          this.logger.error(`[${MqttConnectionService.name}] => Publish error: ${error.message}`);
        }
      });
    } else {
      this.logger.error(`[${MqttConnectionService.name}] => Cannot publish, MQTT client is not connected`);
    }
  }

  public disconnect(): void {
    if (this.client) {
      this.client.end();
      this.logger.info(`[${MqttConnectionService.name}] => MQTT client disconnected`);
    }
  }
}