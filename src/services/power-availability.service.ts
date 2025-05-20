import 'reflect-metadata';
import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PowerAvailability } from '../entities/power-availability.entity';
import { Repository } from 'typeorm';
import { WINSTON_LOGGER } from '../modules/logger.module';
import { Logger } from 'winston';

@Injectable()
export class PowerAvailabilityService {

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        @InjectRepository(PowerAvailability)
        private powerAvailabilityRepository: Repository<PowerAvailability>,
    ) { }

    async processApplicationStart() {
        this.logger.info(`[${PowerAvailabilityService.name}].${this.processApplicationStart.name} => Start`);
        let powerAvailability: PowerAvailability;
        const fs = require('fs');
        if (fs.existsSync('server.off')) {
            this.logger.info(`[${PowerAvailabilityService.name}].${this.processApplicationStart.name} => Server stopped correctly.`);
            fs.unlinkSync('server.off');
            const maxId = await this.powerAvailabilityRepository
                .createQueryBuilder('pa')
                .select('MAX(pa.id)', 'max')
                .getRawOne();
            // tslint:disable-next-line: no-string-literal
            powerAvailability = await this.powerAvailabilityRepository.findOne({ where: { id: maxId['max'] } });
        } else {
            this.logger.error(`[${PowerAvailabilityService.name}].${this.processApplicationStart.name} => Server stopped unexpectedly.`);
        }
        if (!powerAvailability) {
            powerAvailability = new PowerAvailability();

        }
        powerAvailability.updated = new Date();
        await this.powerAvailabilityRepository.save(powerAvailability);
        this.logger.info(`[${PowerAvailabilityService.name}].${this.processApplicationStart.name} => Finish`);
    }

    async updatePowerAvailability() {
        const maxId = await this.powerAvailabilityRepository
            .createQueryBuilder('pa')
            .select('MAX(pa.id)', 'max')
            .getRawOne();
        // tslint:disable-next-line: no-string-literal
        let powerAvailability = await this.powerAvailabilityRepository.findOne({ where: { id: maxId.max } });
        if (!powerAvailability) {
            powerAvailability = new PowerAvailability();
        }
        powerAvailability.updated = new Date();
        await this.powerAvailabilityRepository.save(powerAvailability);
    }

    async processApplicationShutdown(signal?: string) {
        this.logger.info(`[${PowerAvailabilityService.name}].${this.processApplicationShutdown.name} => Start`);
        this.logger.info(`[${PowerAvailabilityService.name}].${this.processApplicationShutdown.name} => ` +
            `Received shutdown signal: '${signal}'`);
        const fs = require('fs');
        fs.writeFile('server.off', 'server.off', async (error: any) => {
            if (error) {
                this.logger.debug(`[${PowerAvailabilityService.name}].${this.processApplicationShutdown.name} => ` +
                    `Error creating of shutdown file: ${error}`);
            }
        });
        this.logger.info(`[${PowerAvailabilityService.name}].${this.processApplicationShutdown.name} => Finish`);
    }

}
