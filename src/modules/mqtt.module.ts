import { Module } from '@nestjs/common';
import { LoggerModule } from './logger.module';
import { MqttClientService } from '../services/mqtt-client.service';
import { ConfigModule } from './config.module';
import { PowerDataModule } from './power-data.module';
import { ServicesModule } from './services.module';
import { CollectDataModule } from './collect-data.module';
import { MqttConnectionService } from '../services/mqtt-connection.service';

@Module({
    imports: [
        LoggerModule,
        ConfigModule,
        PowerDataModule,
        ServicesModule,
        CollectDataModule,
    ],
    providers: [MqttClientService, MqttConnectionService],
    exports: [MqttClientService],
})
export class MqttModule { }
