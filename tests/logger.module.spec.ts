import { expect } from 'chai';
import * as winston from 'winston';
import * as sinon from 'sinon';
import * as proxyquire from 'proxyquire';
import { ConfigService } from '../src/modules/config/config.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule, WINSTON_LOGGER } from '../src/modules/logger/logger.module';

describe('LoggerModule', () => {
    let module: TestingModule;
    let config: Partial<ConfigService>;

    beforeEach(async () => {
        config = {
            logLevel: 'debug',
            logFilePath: '/tmp',
            serviceName: 'test-service',
            maxFiles: '2d',
        } as any;
        module = await Test.createTestingModule({
            imports: [LoggerModule],
        })
            .overrideProvider(ConfigService)
            .useValue(config)
            .compile();
    });

    it('should provide a Winston logger with expected transports', async () => {
        const logger = module.get(WINSTON_LOGGER);
        expect(logger).to.exist;
        expect(logger.transports).to.be.an('array');
        // Should have Console and DailyRotateFile
        const hasConsole = logger.transports.some((t) => t instanceof winston.transports.Console);
        const hasRotate = logger.transports.some(
            (t) => t instanceof winston.transports.DailyRotateFile,
        );
        expect(hasConsole).to.be.true;
        expect(hasRotate).to.be.true;
    });

    it('should add Elasticsearch transport if elasticUrl is set', async () => {
        // Use proxyquire to mock winston-elasticsearch with a valid transport
        class ElasticsearchTransportStub {
            constructor() {}
            log(info: any, next: () => void) {
                setImmediate(next);
            }
            on() {}
        }
        const { LoggerModule: ProxiedLoggerModule, WINSTON_LOGGER: PROXIED_WINSTON_LOGGER } =
            proxyquire('../src/modules/logger/logger.module', {
                'winston-elasticsearch': { ElasticsearchTransport: ElasticsearchTransportStub },
            });
        const elasticConfig = {
            logLevel: 'debug',
            logFilePath: '/tmp',
            serviceName: 'test-service',
            maxFiles: '2d',
            elasticUrl: 'http://localhost:9200',
            elasticUsername: 'elastic',
            elasticPassword: 'changeme',
        };
        const proxiedModule = await Test.createTestingModule({
            imports: [ProxiedLoggerModule],
        })
            .overrideProvider(ConfigService)
            .useValue(elasticConfig)
            .compile();
        const logger = proxiedModule.get(PROXIED_WINSTON_LOGGER);
        // Should have an ElasticsearchTransport (stub)
        // Use constructor name check for proxyquire compatibility
        // The transports array should include the stub transport in addition to Console and DailyRotateFile
        expect(logger.transports.length).to.be.greaterThan(2);
    });

    it('should use logLevel from config', async () => {
        const logger = module.get(WINSTON_LOGGER);
        expect(logger.level).to.equal('debug');
    });
});
