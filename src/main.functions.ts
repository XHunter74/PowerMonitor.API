import * as apm from 'elastic-apm-node';
import { ConfigService } from './modules/config/config.service';
import { Constants } from './constants';
import { delay } from './common/utils';
import * as ping from 'ping';
import { Logger } from 'winston';

export function initElasticApm() {
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
}

export async function waitNetworkAccess(
    bootstrapName: string,
    config: ConfigService,
    logger: Logger,
) {
    const mode = process.env.NODE_ENV;

    if (!mode || (mode && mode === 'development')) {
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
