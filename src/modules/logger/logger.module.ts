import { Module } from '@nestjs/common';
import { ConfigModule } from '../../config/config.module';
import { ConfigService } from '../../config/config.service';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const WINSTON_LOGGER = 'WINSTON_LOGGER';

@Module({
    imports: [ConfigModule],
    providers: [
        {
            provide: WINSTON_LOGGER,
            useFactory: (config: ConfigService) => {
                const transports: any = [
                    new winston.transports.Console({
                        format: winston.format.combine(
                            winston.format.colorize(),
                            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                                return `${String(timestamp)} [${level}]: ${String(message)} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                            }),
                        ),
                        level: config.logLevel || 'info',
                    }),
                    new winston.transports.DailyRotateFile({
                        filename: `${config.logFilePath}/${config.serviceName}-%DATE%.log`,
                        datePattern: 'YYYY-MM-DD',
                        zippedArchive: true,
                        maxFiles: config.maxFiles || '7d',
                        level: config.logLevel || 'info',
                        format: winston.format.combine(
                            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                            winston.format.printf(({ timestamp, level, message, ...meta }) => {
                                return `${String(timestamp)} [${level}]: ${String(message)} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
                            }),
                        ),
                    }),
                ];

                return winston.createLogger({
                    level: config.logLevel || 'info',
                    transports,
                    handleExceptions: true,
                });
            },
            inject: [ConfigService],
        },
    ],
    exports: [WINSTON_LOGGER],
})
export class LoggerModule {}
