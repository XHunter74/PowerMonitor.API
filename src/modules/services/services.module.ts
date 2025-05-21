import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { CollectDataModule } from '../collect-data/collect-data.module';

@Module({
    imports: [LoggerModule, CollectDataModule],
    controllers: [ServicesController],
    providers: [ServicesService],
    exports: [ServicesService],
})
export class ServicesModule {}
