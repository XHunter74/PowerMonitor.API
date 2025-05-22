import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { ConfigModule } from '../../config/config.module';
import { CollectDataModule } from '../collect-data/collect-data.module';
import { ScheduledTasksService } from './scheduled-tasks.service';
import { InfoModule } from '../info/info.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTokensEntity } from '../../entities/user-tokens.entity';
import { MqttModule } from '../mqtt/mqtt.module';
import { PowerDataModule } from '../power-data/power-data.module';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [
        LoggerModule,
        TypeOrmModule.forFeature([UserTokensEntity]),
        ConfigModule,
        HttpModule,
        CollectDataModule,
        InfoModule,
        MqttModule,
        PowerDataModule,
    ],
    controllers: [],
    providers: [ScheduledTasksService],
    exports: [],
})
export class ScheduledTasksModule {}
