import { expect } from 'chai';
import * as sinon from 'sinon';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { ConfigService } from '../../src/config/config.service';

describe('ConfigService', () => {
    let readFileSyncStub: sinon.SinonStub;
    let statSyncStub: sinon.SinonStub;
    let dotenvParseStub: sinon.SinonStub;
    let envConfig: any;

    beforeEach(() => {
        envConfig = {
            SERVICE_PORT: '3000',
            DATABASE_TYPE: 'postgres',
            DATABASE_HOST: 'localhost',
            DATABASE_PORT: '5432',
            DATABASE_USER: 'user',
            DATABASE_NAME: 'dbname',
            DATABASE_USER_PASSWORD: 'pass',
            LOG_LEVEL: 'info',
            SERVICE_NAME: 'PowerMonitor',
            LOG_FILE_PATH: '/logs',
            ELASTIC_URL: 'http://elastic',
            ELASTIC_USERNAME: 'elastic',
            ELASTIC_PASSWORD: 'elasticpass',
            ELASTIC_APM_URL: 'http://apm',
            ELASTIC_APM_API_KEY: 'apikey',
            MAX_FILES: '7',
            TOKEN_SECRET_KEY: 'secret',
            TOKEN_LIFETIME: '3600',
            REFRESH_TOKEN_LIFETIME: '7200',
            SERIAL_PORT_NAME: '/dev/ttyUSB0',
            SERIAL_PORT_SPEED: '9600',
            POWER_COEFFICIENT: '1.5',
            SMTP_HOST: 'smtp',
            SMTP_PORT: '465',
            SMTP_USER: 'smtpuser',
            SMTP_PASSWORD: 'smtppass',
            FROM_EMAIL: 'from@example.com',
            TO_EMAILS: 'a@example.com, b@example.com',
            HEALTH_SERVICE_ENDPOINT: 'http://health',
            HEALTH_SERVICE_API_KEY: 'healthkey',
            IS_DEV_ENVIRONMENT: 'true',
            MQTT_SERVER: 'mqtt',
            MQTT_PORT: '1883',
            MQTT_USER: 'mqttuser',
            MQTT_PASSWORD: 'mqttpass',
            MQTT_CLIENT: 'client',
            VOLTAGE_CALIBRATION: '1.1',
            CURRENT_CALIBRATION: '2.2',
            POWER_FACTOR_CALIBRATION: '0.9',
            CHECK_HOST_IP: '127.0.0.1',
            ALLOW_ORIGINS: 'http://localhost,http://127.0.0.1',
            TELEGRAM_TOKEN: 'token',
            TELEGRAM_CHAT_ID: '123456',
        };
        readFileSyncStub = sinon.stub(fs, 'readFileSync').returns('');
        statSyncStub = sinon.stub(fs, 'statSync').returns({
            isFile: () => true,
            isDirectory: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
            dev: 0,
            ino: 0,
            mode: 0,
            nlink: 0,
            uid: 0,
            gid: 0,
            rdev: 0,
            size: 0,
            blksize: 0,
            blocks: 0,
            atimeMs: 0,
            mtimeMs: 0,
            ctimeMs: 0,
            birthtimeMs: 0,
            atime: new Date(),
            mtime: new Date(),
            ctime: new Date(),
            birthtime: new Date(),
        } as fs.Stats);
        dotenvParseStub = sinon.stub(dotenv, 'parse').returns(envConfig);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should load config from env file', () => {
        const config = new ConfigService();
        expect(config.servicePort).to.equal(3000);
        expect(config.databaseType).to.equal('postgres');
        expect(config.databaseHost).to.equal('localhost');
        expect(config.databasePort).to.equal(5432);
        expect(config.databaseUser).to.equal('user');
        expect(config.databaseName).to.equal('dbname');
        expect(config.databaseUserPassword).to.equal('pass');
        expect(config.logLevel).to.equal('info');
        expect(config.serviceName).to.equal('PowerMonitor');
        expect(config.logFilePath).to.equal('/logs');
        expect(config.elasticUrl).to.equal('http://elastic');
        expect(config.elasticUsername).to.equal('elastic');
        expect(config.elasticPassword).to.equal('elasticpass');
        expect(config.elasticApmUrl).to.equal('http://apm');
        expect(config.elasticApmApiKey).to.equal('apikey');
        expect(config.maxFiles).to.equal('7d');
        expect(config.tokenSecretKey).to.equal('secret');
        expect(config.tokenLifeTime).to.equal(3600);
        expect(config.refreshTokenLifeTime).to.equal(7200);
        expect(config.serialPortName).to.equal('/dev/ttyUSB0');
        expect(config.serialPortSpeed).to.equal(9600);
        expect(config.powerCoefficient).to.equal(1.5);
        expect(config.smtpHost).to.equal('smtp');
        expect(config.smtpPort).to.equal(465);
        expect(config.smtpUser).to.equal('smtpuser');
        expect(config.smtpPassword).to.equal('smtppass');
        expect(config.fromEmail).to.equal('from@example.com');
        expect(config.toEmails).to.deep.equal(['a@example.com', 'b@example.com']);
        expect(config.healthServiceEndpoint).to.equal('http://health');
        expect(config.healthServiceApiKey).to.equal('healthkey');
        expect(config.isDevEnvironment).to.equal(true);
        expect(config.mqttServer).to.equal('mqtt');
        expect(config.mqttPort).to.equal(1883);
        expect(config.mqttUser).to.equal('mqttuser');
        expect(config.mqttPassword).to.equal('mqttpass');
        expect(config.mqttClient).to.equal('client');
        expect(config.voltageCalibration).to.equal(1.1);
        expect(config.currentCalibration).to.equal(2.2);
        expect(config.powerFactorCalibration).to.equal(0.9);
        expect(config.checkHostIp).to.equal('127.0.0.1');
        expect(config.allowOrigins).to.deep.equal(['http://localhost', 'http://127.0.0.1']);
        expect(config.telegramToken).to.equal('token');
        expect(config.telegramChatId).to.equal(123456);
    });

    it('should fallback to default config if file not found', () => {
        statSyncStub.onFirstCall().throws();
        statSyncStub.onSecondCall().returns(true);
        const config = new ConfigService();
        expect(readFileSyncStub.called).to.be.true;
    });

    it('should return false for isDevEnvironment if not set', () => {
        delete envConfig.IS_DEV_ENVIRONMENT;
        dotenvParseStub.returns(envConfig);
        const config = new ConfigService();
        expect(config.isDevEnvironment).to.be.false;
    });

    it('should return false for isDevEnvironment if set to false', () => {
        envConfig.IS_DEV_ENVIRONMENT = 'false';
        dotenvParseStub.returns(envConfig);
        const config = new ConfigService();
        expect(config.isDevEnvironment).to.be.false;
    });
});
