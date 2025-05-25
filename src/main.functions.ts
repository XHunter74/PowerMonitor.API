import * as apm from 'elastic-apm-node';
import { ConfigService } from './config/config.service';
import { Constants } from './config/constants';
import { delay } from './shared/utils/utils';
import * as ping from 'ping';
import { Logger } from 'winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { environment } from './config/environments';

export function initElasticApm() {
    const config = new ConfigService();

    if (config.elasticApmUrl && config.elasticApmApiKey) {
        apm.start({
            serviceName: 'power-monitor-api',
            serviceVersion: environment.version,
            serverUrl: config.elasticApmUrl,
            apiKey: config.elasticApmApiKey,
            environment: process.env.NODE_ENV || Constants.ApmDefaultEnvironment,
            captureBody: 'all',
            active: true,
            logLevel: (config.logLevel as apm.LogLevel) || 'info',
            centralConfig: false,
        });
    }
}

export async function waitNetworkAccess(
    bootstrapName: string,
    config: ConfigService,
    logger: Logger,
) {
    const mode = process.env.NODE_ENV;

    if (!mode || (mode && mode !== Constants.ProductionEnvironment)) {
        logger.info(`[Startup].${bootstrapName} => Application is running in '${mode}' mode`);
        return;
    }

    let pingResult: any;

    do {
        pingResult = await ping.promise.probe(config.checkHostIp);
        if (!pingResult.alive) {
            logger.error(
                `[Startup].${bootstrapName} => Host '${config.checkHostIp}' is not available`,
            );
            await delay(Constants.PingDelay);
        } else {
            logger.info(`[Startup].${bootstrapName} => Host '${config.checkHostIp}' is available`);
        }
    } while (!pingResult.alive);

    await delay(Constants.NetworkWaitingDelay);
}

export function configureSwagger(app: any) {
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
}
