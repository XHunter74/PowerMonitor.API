import {
    Controller,
    Get,
    UseGuards,
    Post,
    Body,
    Param,
    Delete,
    HttpCode,
    Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { Logger } from 'winston';
import { EnergyMeteringService } from './energy-metering.service';
import { AuthGuard } from '@nestjs/passport';
import { MeterDataDto } from '../../shared/dto/meter-data.dto';
import { FactualDataDto } from '../../shared/dto/factual-data.dto';
import { PowerAcc } from '../../entities/power-acc.entity';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { WINSTON_LOGGER } from '../logger/logger.module';

@ApiTags('Power Consumption')
@Controller('api/power-consumption')
export class PowerConsumptionController {
    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly energyMeteringService: EnergyMeteringService,
    ) {}

    /**
     * Returns all energy metering data. Admin only.
     * @returns Array of meter data DTOs
     */
    @Get('energy-data')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @ApiOperation({ summary: 'Get all energy metering data (admin only).' })
    @ApiResponse({ status: 200, description: 'Array of meter data DTOs returned.' })
    async getEnergyMeteringData(): Promise<MeterDataDto[]> {
        this.logger.info(
            `[${PowerConsumptionController.name}].${this.getEnergyMeteringData.name} => Start`,
        );
        const data = await this.energyMeteringService.getPowerMeterData();
        this.logger.info(
            `[${PowerConsumptionController.name}].${this.getEnergyMeteringData.name} => Finish`,
        );
        return data;
    }

    /**
     * Adds a new factual energy data record. Admin only.
     * @param factualData Factual data DTO
     * @returns The created PowerAcc entity
     */
    @Post('energy-data')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @ApiOperation({ summary: 'Add a new factual energy data record (admin only).' })
    @ApiBody({ type: FactualDataDto })
    @ApiResponse({ status: 201, description: 'Factual data record created.' })
    async addNewFactualData(@Body() factualData: FactualDataDto): Promise<PowerAcc> {
        this.logger.info(
            `[${PowerConsumptionController.name}].${this.addNewFactualData.name} => Start`,
        );
        this.logger.info(
            `[${PowerConsumptionController.name}].${this.addNewFactualData.name} => ` +
                `Factual Data = '${JSON.stringify(factualData)}'`,
        );
        const newData = await this.energyMeteringService.addNewFactualData(factualData);
        this.logger.info(
            `[${PowerConsumptionController.name}].${this.addNewFactualData.name} => Finish`,
        );
        return newData;
    }

    /**
     * Deletes a factual energy data record by ID. Admin only.
     * @param recordId ID of the record to delete
     * @returns Confirmation message
     */
    @Delete('energy-data/:recordId')
    @HttpCode(204)
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @ApiOperation({ summary: 'Delete a factual energy data record by ID (admin only).' })
    @ApiParam({ name: 'recordId', type: Number })
    @ApiResponse({ status: 204, description: 'Factual data record deleted.' })
    async deleteFactualData(@Param('recordId') recordId: number) {
        this.logger.info(
            `[${PowerConsumptionController.name}].${this.deleteFactualData.name} => Start`,
        );
        this.logger.info(
            `[${PowerConsumptionController.name}].${this.deleteFactualData.name} => ` +
                `Record Id: '${recordId}'`,
        );
        recordId = Number(recordId);
        await this.energyMeteringService.deleteFactualData(recordId);
        this.logger.info(
            `[${PowerConsumptionController.name}].${this.deleteFactualData.name} => Finish`,
        );
        return `Deleted record with Id: ${recordId}`;
    }
}
