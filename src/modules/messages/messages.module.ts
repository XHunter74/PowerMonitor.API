import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { ConfigModule } from '../config/config.module';
import { TelegramService } from './telegram.service';
import { EmailService } from './email.service';

@Module({
  imports: [
    LoggerModule,
    ConfigModule,
  ],
  providers: [TelegramService, EmailService],
  exports: [TelegramService, EmailService],
})
export class MessagesModule { }
