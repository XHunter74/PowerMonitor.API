import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { MqttClientService } from './mqtt-client.service';
import { ConfigModule } from '../config/config.module';
import { PowerDataModule } from '../power-data/power-data.module';
import { ServicesModule } from '../services/services.module';
import { CollectDataModule } from '../collect-data/collect-data.module';
import { MqttConnectionService } from './mqtt-connection.service';

@Module({
    imports: [LoggerModule, ConfigModule, PowerDataModule, ServicesModule, CollectDataModule],
    providers: [MqttClientService, MqttConnectionService],
    exports: [MqttClientService],
})
export class MqttModule {}
