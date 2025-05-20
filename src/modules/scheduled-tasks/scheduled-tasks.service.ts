import 'reflect-metadata';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { Logger } from 'winston';
import { PowerAvailabilityService } from '../power-data/power-availability.service';
import { CollectDataService } from '../collect-data/collect-data.service';
import { ServicesService } from '../services/services.service';
import { ConfigService } from '../config/config.service';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import moment = require('moment');
import { UserTokensEntity } from '../../entities/user-tokens.entity';
import { MqttClientService } from '../mqtt/mqtt-client.service';
import { EnergyMeteringService } from '../power-data/energy-metering.service';
import { Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class ScheduledTasksService implements OnApplicationShutdown {

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly powerAvailabilityService: PowerAvailabilityService,
        private readonly collectDataService: CollectDataService,
        private readonly energyMeteringService: EnergyMeteringService,
        private readonly servicesService: ServicesService,
        private readonly config: ConfigService,
        private readonly mqttService: MqttClientService,
        private readonly entityManager: EntityManager,
        @InjectRepository(UserTokensEntity) private tokensRepository: Repository<UserTokensEntity>,
    ) {
    }

    @Timeout(1000)
    async runOnStart() {
        this.logger.info(`[${ScheduledTasksService.name}].${this.runOnStart.name} => Start`);
        if (!this.config.IsDevEnvironment) {
            await this.powerAvailabilityService.processApplicationStart();
        }
        await this.collectDataService.start();
        await this.servicesService.getSystemInfo();
        await this.energyMeteringService.updatePowerCoefficient();
        this.logger.info(`[${ScheduledTasksService.name}].${this.runOnStart.name} => Finish`);
    }

    @Interval(5000)
    async runPeriodically() {
        try {
            await this.powerAvailabilityService.updatePowerAvailability();
        } catch (error) {
            this.logger.debug(`[${ScheduledTasksService.name}].updatePowerAvailability => ` +
                `Error : ${error}`);
        }
        try {
            await this.collectDataService.checkSerialAvailability();
        } catch (error) {
            this.logger.debug(`[${ScheduledTasksService.name}].checkSerialAvailability => ` +
                `Error : ${error}`);
        }
        try {
            await this.mqttService.publishPowerData();
        } catch (error) {
            this.logger.debug(`[${ScheduledTasksService.name}].publishPowerData => ` +
                `Error : ${error}`);
        }
    }

    @Interval(3600000)
    async runHourly() {
        this.logger.info(`[${ScheduledTasksService.name}].${this.runHourly.name} => Start`);
        try {
            await this.deleteOutdatedTokens();
            await this.deleteOutdatedVoltageData();
        } catch (err) {
            this.logger.error(err, `[${ScheduledTasksService.name}].${this.runHourly.name} => Exception occurred ^^^`);
        }
        this.logger.info(`[${ScheduledTasksService.name}].${this.runHourly.name} => Finish`);
    }

    private async deleteOutdatedVoltageData() {
        this.logger.info(`[${ScheduledTasksService.name}].${this.deleteOutdatedVoltageData.name} => Start`);
        const now = new Date();
        let startYear = now.getFullYear();
        let startMonth = now.getMonth() - 1;
        if (startMonth < 0) {
            startMonth = 11;
            startYear--;
        }
        const startDate = new Date(startYear, startMonth, now.getDate(), 0, 0, 0);
        const startDateStr = startDate.toISOString().split('T')[0];

        const sql = `DELETE FROM voltage_data WHERE created < '${startDateStr}'`;
        await this.entityManager.query(sql);

        this.logger.info(`[${ScheduledTasksService.name}].${this.deleteOutdatedVoltageData.name} => Finish`);
    }

    private async deleteOutdatedTokens() {
        this.logger.info(`[${ScheduledTasksService.name}].${this.deleteOutdatedTokens.name} => Start`);

        const intervalInSeconds = this.config.RefreshTokenLifeTime;
        const expirationDate = moment().subtract(intervalInSeconds, 'seconds').toDate();

        const tokensForDelete = await this.tokensRepository.createQueryBuilder('token')
            .where('token.created < :expirationDate', { expirationDate })
            .getMany();

        this.logger.info(`[${ScheduledTasksService.name}].${this.deleteOutdatedTokens.name} => Will be deleted '${tokensForDelete.length}' tokens`);

        if (tokensForDelete.length > 0) {
            await this.tokensRepository.remove(tokensForDelete);
        }

        this.logger.info(`[${ScheduledTasksService.name}].${this.deleteOutdatedTokens.name} => Finish`);
    }

    async onApplicationShutdown(signal?: string) {
        this.logger.info(`[${ScheduledTasksService.name}].${this.onApplicationShutdown.name} => Start`);
        this.logger.info(`[${ScheduledTasksService.name}].${this.onApplicationShutdown.name} => ` +
            `Received shutdown signal: '${signal}'`);
        this.powerAvailabilityService.processApplicationShutdown(signal);
        this.mqttService.processApplicationShutdown(signal);
        this.collectDataService.stop();
        this.logger.info(`[${ScheduledTasksService.name}].${this.onApplicationShutdown.name} => Finish`);
    }
}
