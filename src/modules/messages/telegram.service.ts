import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { Logger } from 'winston';
import { Bot } from 'node-telegram-bot-api';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class TelegramService {
    private telegramBot: Bot;

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly config: ConfigService,
    ) {
        // v2 never starts polling on its own (startPolling() must be called explicitly),
        // so there is no equivalent of v1's `{ polling: false }` option to pass here.
        this.telegramBot = new Bot(config.telegramToken);
    }

    public async sendTelegramMessage(message: string) {
        this.logger.info(`[${TelegramService.name}].${this.sendTelegramMessage.name} => Start`);
        try {
            const result = await this.telegramBot.api.sendMessage({
                chat_id: this.config.telegramChatId,
                text: message,
            });
            this.logger.info(
                `[${TelegramService.name}].${this.sendTelegramMessage.name} => ` +
                    `Message '${result.message_id}' was sending successfully `,
            );
        } catch (error) {
            this.logger.error(
                `[${TelegramService.name}].${this.sendTelegramMessage.name} => ` +
                    `Error: ${error}`,
            );
        }
    }
}
