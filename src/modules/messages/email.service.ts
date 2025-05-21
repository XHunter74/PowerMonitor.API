import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { Logger } from 'winston';
import { ConfigService } from '../config/config.service';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly config: ConfigService,
    ) {}

    sendErrorEmailMessage() {
        this.logger.info(`[${EmailService.name}].${this.sendErrorEmailMessage.name} => Start`);
        for (const email of this.config.toEmails) {
            this.sendEmail(
                email,
                'PowerMonitor Serial Data Is Not Available',
                'PowerMonitor Serial Data Is Not Available',
            );
        }
        this.logger.info(`[${EmailService.name}].${this.sendErrorEmailMessage.name} => Finish`);
    }

    private sendEmail(toEmail: string, subject, htmlBody: string) {
        // nodemailer is now imported at the top of the file
        const smtpTransport = nodemailer.createTransport({
            host: this.config.smtpHost,
            port: this.config.smtpPort,
            secure: true,
            auth: {
                user: this.config.smtpUser,
                pass: this.config.smtpPassword,
            },
        });
        const mailOptions = {
            from: this.config.fromEmail,
            to: toEmail,
            subject,
            generateTextFromHTML: true,
            html: htmlBody,
        };
        smtpTransport.sendMail(mailOptions, (error, info) => {
            if (error) {
                this.logger.error(
                    `[${EmailService.name}].${this.sendEmail.name} => ` + `Error: ${error}`,
                );
                return;
            }
            this.logger.info(
                `[${EmailService.name}].${this.sendEmail.name} => ` +
                    `Message '${info.messageId}' sent: '${info.response}'`,
            );
        });
        this.logger.info(`[${EmailService.name}].${this.sendEmail.name} => Finish`);
    }
}
