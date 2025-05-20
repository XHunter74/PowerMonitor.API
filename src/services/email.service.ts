import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_LOGGER } from '../modules/logger.module';
import { Logger } from 'winston';
import { ConfigService } from './config.service';

@Injectable()
export class EmailService {

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly config: ConfigService,
    ) { }

    async sendErrorEmailMessage() {
        this.logger.info(`[${EmailService.name}].${this.sendErrorEmailMessage.name} => Start`);
        this.config.ToEmails.forEach(async (email) => {
            await this.sendEmail(email, 'PowerMonitor Serial Data Is Not Available', 'PowerMonitor Serial Data Is Not Available');
        });
        this.logger.info(`[${EmailService.name}].${this.sendErrorEmailMessage.name} => Finish`);
    }

    private async sendEmail(toEmail: string, subject, htmlBody: string) {
        this.logger.info(`[${EmailService.name}].${this.sendEmail.name} => Start`);
        const nodemailer = require('nodemailer');
        const smtpTransport = nodemailer.createTransport({
            host: this.config.SmtpHost,
            port: this.config.SmtpPort,
            secure: true,
            auth: {
                user: this.config.SmtpUser,
                pass: this.config.SmtpPassword,
            },
        });
        const mailOptions = {
            from: this.config.FromEmail,
            to: toEmail,
            subject,
            generateTextFromHTML: true,
            html: htmlBody,
        };
        smtpTransport.sendMail(mailOptions, async (error, info) => {
            if (error) {
                this.logger.error(`[${EmailService.name}].${this.sendEmail.name} => ` +
                    `Error: ${error}`);
                return;
            }
            this.logger.info(`[${EmailService.name}].${this.sendEmail.name} => ` +
                `Message '${info.messageId}' sent: '${info.response}'`);
        });
        this.logger.info(`[${EmailService.name}].${this.sendEmail.name} => Finish`);
    }
}
