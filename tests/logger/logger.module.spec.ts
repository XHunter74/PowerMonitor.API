import { expect } from 'chai';
import * as winston from 'winston';
import { ConfigService } from '../../src/config/config.service';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerModule, WINSTON_LOGGER } from '../../src/modules/logger/logger.module';

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

    it('should use logLevel from config', async () => {
        const logger = module.get(WINSTON_LOGGER);
        expect(logger.level).to.equal('debug');
    });
});
