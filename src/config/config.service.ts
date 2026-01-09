import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { Constants } from './constants';

export class ConfigService {
    private readonly envConfig: { [key: string]: string };

    constructor() {
        let filePath = Constants.DefaultConfig;
        if (process.env.NODE_ENV) {
            filePath = `${process.env.NODE_ENV}.env`;
        }
        try {
            fs.statSync(filePath);
        } catch {
            filePath = Constants.DefaultConfig;
        }
        this.envConfig = dotenv.parse(fs.readFileSync(filePath));
    }

    get(key: string): string {
        return this.envConfig[key];
    }

    get servicePort(): number {
        return Number(this.envConfig.SERVICE_PORT);
    }

    get databaseType(): any {
        return this.envConfig.DATABASE_TYPE;
    }

    get databaseHost(): string {
        return this.envConfig.DATABASE_HOST;
    }

    get databasePort(): number {
        return Number(this.envConfig.DATABASE_PORT);
    }

    get databaseUser(): string {
        return this.envConfig.DATABASE_USER;
    }

    get databaseName(): string {
        return this.envConfig.DATABASE_NAME;
    }

    get databaseUserPassword(): string {
        return this.envConfig.DATABASE_USER_PASSWORD;
    }

    get logLevel(): string {
        return this.envConfig.LOG_LEVEL;
    }

    get serviceName(): string {
        return this.envConfig.SERVICE_NAME;
    }

    get logFilePath(): string {
        return this.envConfig.LOG_FILE_PATH;
    }

    get elasticUrl(): string {
        return this.envConfig.ELASTIC_URL;
    }

    get elasticUsername(): string {
        return this.envConfig.ELASTIC_USERNAME;
    }

    get elasticPassword(): string {
        return this.envConfig.ELASTIC_PASSWORD;
    }

    get elasticApmUrl(): string {
        return this.envConfig.ELASTIC_APM_URL;
    }

    get elasticApmApiKey(): string {
        return this.envConfig.ELASTIC_APM_API_KEY;
    }

    get maxFiles(): string {
        return `${Number(this.envConfig.MAX_FILES)}d`;
    }

    get tokenSecretKey(): string {
        return this.envConfig.TOKEN_SECRET_KEY;
    }

    get tokenLifeTime(): number {
        return Number(this.envConfig.TOKEN_LIFETIME);
    }

    get refreshTokenLifeTime(): number {
        return Number(this.envConfig.REFRESH_TOKEN_LIFETIME);
    }

    get serialPortName(): string {
        return this.envConfig.SERIAL_PORT_NAME;
    }

    get serialPortSpeed(): number {
        return Number(this.envConfig.SERIAL_PORT_SPEED);
    }

    get powerCoefficient(): number {
        return Number(this.envConfig.POWER_COEFFICIENT);
    }

    get smtpHost(): string {
        return this.envConfig.SMTP_HOST;
    }

    get smtpPort(): number {
        return Number(this.envConfig.SMTP_PORT);
    }

    get smtpUser(): string {
        return this.envConfig.SMTP_USER;
    }

    get smtpPassword(): string {
        return this.envConfig.SMTP_PASSWORD;
    }

    get fromEmail(): string {
        return this.envConfig.FROM_EMAIL;
    }

    get toEmails(): string[] {
        const emailsStr = this.envConfig.TO_EMAILS;
        const emails = emailsStr
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e && e.length > 0);
        return emails;
    }

    get healthServiceEndpoint(): string {
        return this.envConfig.HEALTH_SERVICE_ENDPOINT;
    }

    get healthServiceApiKey(): string {
        return this.envConfig.HEALTH_SERVICE_API_KEY;
    }

    get isDevEnvironment(): boolean {
        const value = this.envConfig.IS_DEV_ENVIRONMENT;
        if (!value) {
            return false;
        }
        const result = value.toLowerCase() !== 'false';
        return result;
    }

    get mqttServer(): string {
        return this.envConfig.MQTT_SERVER;
    }

    get mqttPort(): number {
        return Number(this.envConfig.MQTT_PORT);
    }

    get mqttUser(): string {
        return this.envConfig.MQTT_USER;
    }

    get mqttPassword(): string {
        return this.envConfig.MQTT_PASSWORD;
    }

    get mqttClient(): string {
        return this.envConfig.MQTT_CLIENT;
    }

    get voltageCalibration(): number {
        return Number(this.envConfig.VOLTAGE_CALIBRATION);
    }

    get currentCalibration(): number {
        return Number(this.envConfig.CURRENT_CALIBRATION);
    }

    get powerFactorCalibration(): number {
        return Number(this.envConfig.POWER_FACTOR_CALIBRATION);
    }

    get checkHostIp(): string {
        return this.envConfig.CHECK_HOST_IP;
    }

    get allowOrigins(): string[] {
        const originsStr = this.envConfig.ALLOW_ORIGINS;
        const origins = originsStr
            .split(',')
            .map((e) => e.trim())
            .filter((e) => e && e.length > 0);
        return origins;
    }

    get corsMaxAge(): number {
        const value = this.envConfig.CORS_MAX_AGE;
        if (!value) {
            return 0;
        }
        const result = Number(value);
        if (isNaN(result)) {
            return 0;
        }
        return result;
    }

    get telegramToken(): string {
        return this.envConfig.TELEGRAM_TOKEN;
    }

    get telegramChatId(): number {
        return Number(this.envConfig.TELEGRAM_CHAT_ID);
    }

    get redisUri(): string {
        return this.envConfig.REDIS_URI;
    }

    get rebootDuration(): number {
        const value = this.envConfig.REBOOT_DURATION;
        if (value) {
            return Number(value);
        }
        return Constants.RebootDuration;
    }
}
