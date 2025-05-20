import { Controller, Get, UseGuards, Post, Body, Put, Param, Delete, HttpCode, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { EnergyMeteringService } from '../services/energy-metering.service';
import { AuthGuard } from '@nestjs/passport';
import { MeterDataDto } from '../models/meter-data.dto';
import { FactualDataDto } from '../models/factual-data.dto';
import { PowerAcc } from '../entities/power-acc.entity';
import { RolesGuard } from '../guards/roles.guard';
import { WINSTON_LOGGER } from '../modules/logger.module';

@Controller('api/power-consumption')
export class PowerConsumptionController {

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly energyMeteringService: EnergyMeteringService,
    ) { }

    @Get('energy-data')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    async getEnergyMeteringData(): Promise<MeterDataDto[]> {
        this.logger.info(`[${PowerConsumptionController.name}].${this.getEnergyMeteringData.name} => Start`);
        const data = await this.energyMeteringService.getPowerMeterData();
        this.logger.info(`[${PowerConsumptionController.name}].${this.getEnergyMeteringData.name} => Finish`);
        return data;
    }

    @Post('energy-data')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    async addNewFactualData(@Body() factualData: FactualDataDto): Promise<PowerAcc> {
        this.logger.info(`[${PowerConsumptionController.name}].${this.addNewFactualData.name} => Start`);
        this.logger.info(`[${PowerConsumptionController.name}].${this.addNewFactualData.name} => ` +
            `Factual Data = '${JSON.stringify(factualData)}'`);
        const newData = await this.energyMeteringService.addNewFactualData(factualData);
        this.logger.info(`[${PowerConsumptionController.name}].${this.addNewFactualData.name} => Finish`);
        return newData;
    }

    @Put('energy-data/:recordId')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    async editFactualData(@Body() factualData: FactualDataDto, @Param('recordId') recordId: number): Promise<FactualDataDto> {
        this.logger.info(`[${PowerConsumptionController.name}].${this.editFactualData.name} => Start`);
        this.logger.info(`[${PowerConsumptionController.name}].${this.editFactualData.name} => ` +
            `Record Id: '${recordId}', Factual Data = '${JSON.stringify(factualData)}'`);
        recordId = Number(recordId);
        const newData = await this.energyMeteringService.editFactualData(recordId, factualData);
        this.logger.info(`[${PowerConsumptionController.name}].${this.editFactualData.name} => Finish`);
        return newData;
    }

    @Delete('energy-data/:recordId')
    @HttpCode(204)
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    async deleteFactualData(@Param('recordId') recordId: number) {
        this.logger.info(`[${PowerConsumptionController.name}].${this.deleteFactualData.name} => Start`);
        this.logger.info(`[${PowerConsumptionController.name}].${this.deleteFactualData.name} => ` +
            `Record Id: '${recordId}'`);
        recordId = Number(recordId);
        await this.energyMeteringService.deleteFactualData(recordId);
        this.logger.info(`[${PowerConsumptionController.name}].${this.deleteFactualData.name} => Finish`);
        return `Deleted record with Id: ${recordId}`;
    }
}
