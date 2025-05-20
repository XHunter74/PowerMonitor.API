import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PowerAvailability } from '../../entities/power-availability.entity';
import { VoltageAmperageData } from '../../entities/voltage-amperage-data.entity';
import { PowerData } from '../../entities/power-data.entity';
import { PowerDataService } from './power-data.service';
import { PowerDataController } from './power-data.controller';
import { PowerConsumptionController } from './power-consumption.controller';
import { EnergyMeteringService } from './energy-metering.service';
import { PowerAcc } from '../../entities/power-acc.entity';
import { ConfigModule } from '../config/config.module';
import { VoltageData } from '../../entities/voltage-data.entity';

@Module({
  imports: [
    LoggerModule,
    ConfigModule,
    TypeOrmModule.forFeature([PowerAvailability, VoltageAmperageData, PowerData, PowerAcc, VoltageData]),
  ],
  controllers: [PowerDataController, PowerConsumptionController],
  providers: [PowerDataService, EnergyMeteringService],
  exports: [PowerDataService, EnergyMeteringService],
})
export class PowerDataModule { }
