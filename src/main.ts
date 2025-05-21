import 'reflect-metadata';
// eslint-disable-next-line import/no-duplicates
import { initElasticApm } from './main.functions';

// Should be before all imports
initElasticApm();

import { ConfigService } from './modules/config/config.service';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

import { SocketIoAdapter } from './modules/socket/socket.adapter';
import { env } from 'process';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { WINSTON_LOGGER } from './modules/logger/logger.module';
import { Logger } from 'winston';
// eslint-disable-next-line import/no-duplicates
import { waitNetworkAccess, configureSwagger } from './main.functions';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const logger: Logger = app.get(WINSTON_LOGGER);
    const config = app.get(ConfigService);

    logger.info(`[Startup].${bootstrap.name} => NODE_ENV='${env.NODE_ENV}'`);
    logger.info(
        `[Startup].${bootstrap.name} => Check availability of host '${config.checkHostIp}'`,
    );

    // Without network access, the application will not start
    // This is important for the production environment
    await waitNetworkAccess(bootstrap.name, config, logger);

    logger.info(`[PowerMonitor app] => it is starting`);

    // Swagger setup
    if (config.isDevEnvironment) {
        configureSwagger(app);
    }

    // Application configuration
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

bootstrap().catch((err) => {
    console.error('Application failed to start:', err);
});
