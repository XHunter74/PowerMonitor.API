import 'reflect-metadata';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PowerAvailability } from '../../entities/power-availability.entity';
import { Repository } from 'typeorm';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { Logger } from 'winston';
import * as fs from 'fs';
import { Constants } from '../../config/constants';
import { ConfigService } from '../../config/config.service';

@Injectable()
export class PowerAvailabilityService {
    private isUpdateBlocked = true;

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        @InjectRepository(PowerAvailability)
        private powerAvailabilityRepository: Repository<PowerAvailability>,
        private readonly configService: ConfigService,
    ) {}

    async processApplicationStart() {
        this.logger.info(
            `[${PowerAvailabilityService.name}].${this.processApplicationStart.name} => Start`,
        );
        try {
            let powerAvailability: PowerAvailability;

            if (fs.existsSync('server.off')) {
                this.logger.info(
                    `[${PowerAvailabilityService.name}].${this.processApplicationStart.name} => Server stopped correctly.`,
                );
                fs.unlinkSync('server.off');
                const maxId = await this.powerAvailabilityRepository
                    .createQueryBuilder('pa')
                    .select('MAX(pa.id)', 'max')
                    .getRawOne();
                powerAvailability = await this.powerAvailabilityRepository.findOne({
                    where: { id: maxId['max'] },
                });
            } else {
                this.logger.error(
                    `[${PowerAvailabilityService.name}].${this.processApplicationStart.name} => Server stopped unexpectedly.`,
                );
            }

            if (!powerAvailability) {
                powerAvailability = new PowerAvailability();
                powerAvailability.created = new Date(
                    new Date().getTime() - this.configService.rebootDuration,
                );
            }

            powerAvailability.updated = new Date();

            await this.powerAvailabilityRepository.save(powerAvailability);

            this.logger.info(
                `[${PowerAvailabilityService.name}].${this.processApplicationStart.name} => Finish`,
            );
        } finally {
            this.isUpdateBlocked = false;
        }
    }

    async updatePowerAvailability() {
        if (this.isUpdateBlocked) {
            return;
        }
        const maxId = await this.powerAvailabilityRepository
            .createQueryBuilder('pa')
            .select('MAX(pa.id)', 'max')
            .getRawOne();

        let powerAvailability = await this.powerAvailabilityRepository.findOne({
            where: { id: maxId.max },
        });

        if (!powerAvailability) {
            powerAvailability = new PowerAvailability();
        }

        powerAvailability.updated = new Date();

        await this.powerAvailabilityRepository.save(powerAvailability);
    }

    processApplicationShutdown(signal?: string) {
        this.logger.info(
            `[${PowerAvailabilityService.name}].${this.processApplicationShutdown.name} => Start`,
        );
        this.logger.info(
            `[${PowerAvailabilityService.name}].${this.processApplicationShutdown.name} => ` +
                `Received shutdown signal: '${signal}'`,
        );
        fs.writeFile('server.off', 'server.off', (error: any) => {
            if (error) {
                this.logger.debug(
                    `[${PowerAvailabilityService.name}].${this.processApplicationShutdown.name} => ` +
                        `Error creating of shutdown file: ${error}`,
                );
            }
        });

        this.logger.info(
            `[${PowerAvailabilityService.name}].${this.processApplicationShutdown.name} => Finish`,
        );
    }
}
