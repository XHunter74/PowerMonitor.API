import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { ElasticsearchTransport } from 'winston-elasticsearch';

export const WINSTON_LOGGER = 'WINSTON_LOGGER';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: WINSTON_LOGGER,
      useFactory: (config: ConfigService) => {
        let esTransport: ElasticsearchTransport | null = null;
        if (config.ElasticUrl) {
          esTransport = new ElasticsearchTransport({
            level: config.LogLevel || 'info',
            index: 'power-monitor-logs',
            indexPrefix: 'power-monitor-logs',
            indexSuffixPattern: 'YYYY-MM-DD',
            ensureIndexTemplate: false,
            flushInterval: 1000,
            clientOpts: {
              node: config.ElasticUrl,
              maxRetries: 5,
              requestTimeout: 10000,
              auth: {
                username: config.ElasticUsername,
                password: config.ElasticPassword,
              }
            },
            transformer: (logData) => ({
              '@timestamp': new Date().toISOString(),
              severity: logData.level,
              environment: process.env.NODE_ENV || 'development',
              message: logData.message,
              fields: {
                ...logData.meta,
              },
            }),
          });
          esTransport.on('error', (err) => {
            console.error('Elasticsearch Transport Error:', err);
          });
          esTransport.on('warn', warn => {
            console.warn('[ElasticTransport Warn]', warn)
          });
          setTimeout(() => {
            console.log('ES Connection?', esTransport['bulkWriter']?.['esConnection']);
          }, 1000);
        }

        const transports: any = [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
              })
            ),
            level: config.LogLevel || 'info',
          }),
          new winston.transports.DailyRotateFile({
            filename: `${config.LogFilePath}/${config.ServiceName}-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxFiles: config.MaxFiles || '7d',
            level: config.LogLevel || 'info',
            format: winston.format.combine(
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
              })
            ),
          }),
        ];

        if (config.ElasticUrl) {
          transports.push(esTransport);
        }

        return winston.createLogger({
          level: config.LogLevel || 'info',
          transports,
          handleExceptions: true,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [WINSTON_LOGGER],
})
export class LoggerModule { }
