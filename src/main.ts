import * as apm from 'elastic-apm-node';
import { ConfigService } from './modules/config/config.service';

const config = new ConfigService();

if (config.ElasticApmUrl && config.ElasticApmApiKey) {
  apm.start({
    serviceName: 'power-monitor-api',
    serverUrl: config.ElasticApmUrl,
    apiKey: config.ElasticApmApiKey,
    environment: process.env.NODE_ENV || 'development',
    captureBody: 'all',
    active: true,
    logLevel: config.LogLevel as apm.LogLevel || 'info',
    centralConfig: false
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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger: Logger = app.get(WINSTON_LOGGER);
  const config = app.get(ConfigService);

  logger.info(`[Startup].${bootstrap.name} => NODE_ENV='${env.NODE_ENV}'`);
  logger.info(`[Startup].${bootstrap.name} => Check availability of host '${config.CheckHostIp}'`);

  await waitNetworkAccess(config, logger);

  logger.info(`[PowerMonitor app] => it is starting`);

  app.useLogger({
    log: (msg) => logger.info(msg),
    error: (msg) => logger.error(msg),
    warn: (msg) => logger.warn(msg),
    debug: (msg) => logger.debug(msg),
    verbose: (msg) => logger.verbose ? logger.verbose(msg) : logger.info(msg),
  });
  app.enableShutdownHooks();
  app.enableCors({ credentials: true, origin: config.AllowOrigins });
  app.useGlobalPipes(new ValidationPipe());
  app.useWebSocketAdapter(new SocketIoAdapter(app, config));
  app.useGlobalFilters(new GlobalExceptionFilter(logger));

  await app.listen(config.ServicePort, () => {
    process.send = process.send || function () { return true };
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
    pingResult = await ping.promise.probe(config.CheckHostIp);
    if (!pingResult.alive) {
      logger.error(`[Startup].${bootstrap.name} => Host '${config.CheckHostIp}' is not available`);
      await delay(Constants.PingDelay);
    } else {
      logger.info(`[Startup].${bootstrap.name} => Host '${config.CheckHostIp}' is available`);
    }
  } while (!pingResult.alive);

  await delay(Constants.NetworkWaitingDelay);
}




bootstrap();
