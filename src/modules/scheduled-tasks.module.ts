import { Module } from '@nestjs/common';
import { LoggerModule } from './logger.module';
import { ConfigModule } from './config.module';
import { CollectDataModule } from './collect-data.module';
import { ScheduledTasksService } from '../services/scheduled-tasks.service';
import { ServicesModule } from './services.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTokensEntity } from '../entities/user-tokens.entity';
import { MqttModule } from './mqtt.module';
import { PowerDataModule } from './power-data.module';
import { HttpModule } from '@nestjs/axios';


@Module({
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([UserTokensEntity]),
    ConfigModule,
    HttpModule,
    CollectDataModule,
    ServicesModule,
    MqttModule,
    PowerDataModule,
  ],
  controllers: [],
  providers: [ScheduledTasksService],
  exports: [],
})
export class ScheduledTasksModule { }
