import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { ConfigModule } from '../../config/config.module';
import { TelegramService } from './telegram.service';

@Module({
    imports: [LoggerModule, ConfigModule],
    providers: [TelegramService],
    exports: [TelegramService],
})
export class MessagesModule {}
