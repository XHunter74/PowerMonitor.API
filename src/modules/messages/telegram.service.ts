import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { Logger } from 'winston';
import TelegramBot = require('node-telegram-bot-api');
import { ConfigService } from '../config/config.service';

@Injectable()
export class TelegramService {

    private telegramBot: TelegramBot;

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly config: ConfigService,
    ) {
        this.telegramBot = new TelegramBot(config.TelegramToken, { polling: false });
    }

    public async sendTelegramMessage(message: string) {
        this.logger.info(`[${TelegramService.name}].${this.sendTelegramMessage.name} => Start`);
        try {
            const result = await this.telegramBot.sendMessage(this.config.TelegramChatId, message);
            this.logger.info(`[${TelegramService.name}].${this.sendTelegramMessage.name} => ` +
                `Message '${result.message_id}' was sending successfully `);
        } catch (error) {
            this.logger.error(`[${TelegramService.name}].${this.sendTelegramMessage.name} => ` +
                `Error: ${error}`);
        }
    }
}
