import { Module } from '@nestjs/common';
import { LoggerModule } from './logger.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PowerAvailabilityService } from '../services/power-availability.service';
import { PowerAvailability } from '../entities/power-availability.entity';
import { CollectDataService } from '../services/collect-data.service';
import { DataService } from '../services/data.service';
import { ConfigModule } from './config.module';
import { ServerData } from '../entities/server-data.entity';
import { VoltageAmperageData } from '../entities/voltage-amperage-data.entity';
import { PowerData } from '../entities/power-data.entity';
import { PowerAcc } from '../entities/power-acc.entity';
import { MessagesModule } from './messages.module';
import { VoltageData } from '../entities/voltage-data.entity';
import { SerialPortService } from '../services/serial-port.service';

@Module({
  imports: [
    LoggerModule,
    ConfigModule,
    MessagesModule,
    TypeOrmModule.forFeature([PowerAvailability, ServerData, VoltageAmperageData, PowerData, PowerAcc, VoltageData]),
  ],
  controllers: [],
  providers: [PowerAvailabilityService, CollectDataService, DataService, SerialPortService],
  exports: [CollectDataService, PowerAvailabilityService, DataService],
})
export class CollectDataModule { }
