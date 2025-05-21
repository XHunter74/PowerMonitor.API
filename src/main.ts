import 'reflect-metadata';
import * as apm from 'elastic-apm-node';
import { ConfigService } from './modules/config/config.service';

const config = new ConfigService();

if (config.elasticApmUrl && config.elasticApmApiKey) {
    apm.start({
        serviceName: 'power-monitor-api',
        serverUrl: config.elasticApmUrl,
        apiKey: config.elasticApmApiKey,
        environment: process.env.NODE_ENV || 'development',
        captureBody: 'all',
        active: true,
        logLevel: (config.logLevel as apm.LogLevel) || 'info',
        centralConfig: false,
    });
}

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as ping from 'ping';
import { SocketIoAdapter } from './modules/socket/socket.adapter';
import { env } from 'process';
import { delay } from './utils';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { WINSTON_LOGGER } from './modules/logger/logger.module';
import { Logger } from 'winston';
import { Constants } from './constants';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger: Logger = app.get(WINSTON_LOGGER);
    const config = app.get(ConfigService);

    logger.info(`[Startup].${bootstrap.name} => NODE_ENV='${env.NODE_ENV}'`);
    logger.info(
        `[Startup].${bootstrap.name} => Check availability of host '${config.checkHostIp}'`,
    );

    await waitNetworkAccess(config, logger);

    logger.info(`[PowerMonitor app] => it is starting`);

    // Swagger setup
    const swaggerConfig = new DocumentBuilder()
        .setTitle('PowerMonitor API')
        .setDescription('API documentation for PowerMonitor')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag(
            'Auth',
            'Authentication endpoints for user login, password management, and user creation.',
        )
        .addTag('Power Data', 'Endpoints for retrieving and analyzing power and voltage data.')
        .addTag(
            'Power Consumption',
            'Endpoints for managing and retrieving power consumption and metering data.',
        )
        .addTag('Services', 'Service endpoints for system info, calibration, and health checks.')
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('swagger', app, document);

    app.useLogger({
        log: (msg) => logger.info(msg),
        error: (msg) => logger.error(msg),
        warn: (msg) => logger.warn(msg),
        debug: (msg) => logger.debug(msg),
        verbose: (msg) => (logger.verbose ? logger.verbose(msg) : logger.info(msg)),
    });
    app.enableShutdownHooks();
    app.enableCors({ credentials: true, origin: config.allowOrigins });
    app.useGlobalPipes(new ValidationPipe());
    app.useWebSocketAdapter(new SocketIoAdapter(app, config));
    app.useGlobalFilters(new GlobalExceptionFilter(logger));

    await app.listen(config.servicePort, () => {
        process.send =
            process.send ||
            (() => {
                return true;
            });
        process.send('ready');
        logger.info(`[Startup].${bootstrap.name} => Application started successfully`);
    });
}

async function waitNetworkAccess(config: ConfigService, logger: Logger) {
    const mode = process.env.NODE_ENV;

    if (!mode || (mode && mode === 'development')) {
        logger.info(`[Startup].${bootstrap.name} => Application is running in '${mode}' mode`);
        return;
    }

    let pingResult: any;

    do {
        pingResult = await ping.promise.probe(config.checkHostIp);
        if (!pingResult.alive) {
            logger.error(
                `[Startup].${bootstrap.name} => Host '${config.checkHostIp}' is not available`,
            );
            await delay(Constants.PingDelay);
        } else {
            logger.info(`[Startup].${bootstrap.name} => Host '${config.checkHostIp}' is available`);
        }
    } while (!pingResult.alive);

    await delay(Constants.NetworkWaitingDelay);
}

bootstrap().catch((err) => {
    console.error('Application failed to start:', err);
});
