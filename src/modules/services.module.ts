import { Module } from '@nestjs/common';
import { LoggerModule } from './logger.module';
import { ServicesService } from '../services/services.service';
import { ServicesController } from '../controllers/services.controller';
import { CollectDataModule } from './collect-data.module';

@Module({
  imports: [
    LoggerModule,
    CollectDataModule,
  ],
  controllers: [ServicesController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule { }
