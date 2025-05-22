import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { InfoService } from './info.service';
import { InfoController } from './info.controller';
import { CollectDataModule } from '../collect-data/collect-data.module';

@Module({
    imports: [LoggerModule, CollectDataModule],
    controllers: [InfoController],
    providers: [InfoService],
    exports: [InfoService],
})
export class InfoModule {}
