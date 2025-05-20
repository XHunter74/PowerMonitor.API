import { Module } from '@nestjs/common';
import { LoggerModule } from './logger.module';
import { ConfigModule } from './config.module';
import { TelegramService } from '../services/telegram.service';
import { EmailService } from '../services/email.service';

@Module({
  imports: [
    LoggerModule,
    ConfigModule,
  ],
  providers: [TelegramService, EmailService],
  exports: [TelegramService, EmailService],
})
export class MessagesModule { }
