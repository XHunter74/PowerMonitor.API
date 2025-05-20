import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { Constants } from '../../constants';

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

    get ServicePort(): number {
        return Number(this.envConfig.SERVICE_PORT);
    }

    get DatabaseType(): any {
        return this.envConfig.DATABASE_TYPE;
    }

    get DatabaseHost(): string {
        return this.envConfig.DATABASE_HOST;
    }

    get DatabasePort(): number {
        return Number(this.envConfig.DATABASE_PORT);
    }

    get DatabaseUser(): string {
        return this.envConfig.DATABASE_USER;
    }

    get DatabaseName(): string {
        return this.envConfig.DATABASE_NAME;
    }

    get DatabaseUserPassword(): string {
        return this.envConfig.DATABASE_USER_PASSWORD;
    }

    get LogLevel(): string {
        return this.envConfig.LOG_LEVEL;
    }

    get ServiceName(): string {
        return this.envConfig.SERVICE_NAME;
    }

    get LogFilePath(): string {
        return this.envConfig.LOG_FILE_PATH;
    }

    get ElasticUrl(): string {
        return this.envConfig.ELASTIC_URL;
    }

    get ElasticUsername(): string {
        return this.envConfig.ELASTIC_USERNAME;
    }

    get ElasticPassword(): string {
        return this.envConfig.ELASTIC_PASSWORD;
    }

    get ElasticApmUrl(): string {
        return this.envConfig.ELASTIC_APM_URL;
    }


    get ElasticApmApiKey(): string {
        return this.envConfig.ELASTIC_APM_API_KEY;
    }

    get MaxFiles(): string {
        return `${Number(this.envConfig.MAX_FILES)}d`;
    }

    get TokenSecretKey(): string {
        return this.envConfig.TOKEN_SECRET_KEY;
    }

    get TokenLifeTime(): number {
        return Number(this.envConfig.TOKEN_LIFETIME);
    }

    get RefreshTokenLifeTime(): number {
        return Number(this.envConfig.REFRESH_TOKEN_LIFETIME);
    }

    get SerialPortName(): string {
        return this.envConfig.SERIAL_PORT_NAME;
    }

    get SerialPortSpeed(): number {
        return Number(this.envConfig.SERIAL_PORT_SPEED);
    }

    get PowerCoefficient(): number {
        return Number(this.envConfig.POWER_COEFFICIENT);
    }

    get SmtpHost(): string {
        return this.envConfig.SMTP_HOST;
    }

    get SmtpPort(): number {
        return Number(this.envConfig.SMTP_PORT);
    }

    get SmtpUser(): string {
        return this.envConfig.SMTP_USER;
    }

    get SmtpPassword(): string {
        return this.envConfig.SMTP_PASSWORD;
    }

    get FromEmail(): string {
        return this.envConfig.FROM_EMAIL;
    }

    get ToEmails(): string[] {
        const emailsStr = this.envConfig.TO_EMAILS;
        const emails = emailsStr.split(',')
            .map(e => e.trim())
            .filter(e => e && e.length > 0);
        return emails;
    }

    get HealthServiceEndpoint(): string {
        return this.envConfig.HEALTH_SERVICE_ENDPOINT;
    }

    get HealthServiceApiKey(): string {
        return this.envConfig.HEALTH_SERVICE_API_KEY;
    }

    get IsDevEnvironment(): boolean {
        const value = this.envConfig.IS_DEV_ENVIRONMENT;
        if (!value) {
            return false;
        }
        const result = value.toLowerCase() !== 'false';
        return result;
    }

    get MqttServer(): string {
        return this.envConfig.MQTT_SERVER;
    }

    get MqttPort(): number {
        return Number(this.envConfig.MQTT_PORT);
    }

    get MqttUser(): string {
        return this.envConfig.MQTT_USER;
    }

    get MqttPassword(): string {
        return this.envConfig.MQTT_PASSWORD;
    }

    get MqttClient(): string {
        return this.envConfig.MQTT_CLIENT;
    }

    get VoltageCalibration(): number {
        return Number(this.envConfig.VOLTAGE_CALIBRATION);
    }

    get CurrentCalibration(): number {
        return Number(this.envConfig.CURRENT_CALIBRATION);
    }

    get PowerFactorCalibration(): number {
        return Number(this.envConfig.POWER_FACTOR_CALIBRATION);
    }

    get CheckHostIp(): string {
        return this.envConfig.CHECK_HOST_IP;
    }

    get AllowOrigins(): string[] {
        const originsStr = this.envConfig.ALLOW_ORIGINS;
        const origins = originsStr.split(',')
            .map(e => e.trim())
            .filter(e => e && e.length > 0);
        return origins;
    }

    get TelegramToken(): string {
        return this.envConfig.TELEGRAM_TOKEN;
    }

    get TelegramChatId(): number {
        return Number(this.envConfig.TELEGRAM_CHAT_ID);
    }
}
