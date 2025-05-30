import { Controller, Get, Query, UseGuards, Inject, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { Logger } from 'winston';
import { PowerDataService } from './power-data.service';
import { AuthGuard } from '@nestjs/passport';
import { daysInMonth } from '../../shared/utils/date-functions';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Constants, Intervals } from '../../config/constants';
import { StartFinishDatesDto } from '../../shared/dto/start-finish-dates.dto';
import { MonthYearDto } from '../../shared/dto/month-year.dto';
import { YearDto } from '../../shared/dto/year.dto';
import { MonthDayOfWeekDto } from '../../shared/dto/month-dayofweek.dto';
import { CacheTTL } from '@nestjs/cache-manager';
import { IgnoreTsCacheInterceptor } from '../../shared/interceptors/ignore-ts.interceptor';

@ApiTags('Power Data')
@Controller('api/power')
export class PowerDataController {
    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly powerDataService: PowerDataService,
    ) {}

    /**
     * Returns voltage and amperage data for the specified date range. Admin only.
     * @param startDateParam Start date (ISO string)
     * @param finishDateParam Finish date (ISO string)
     */
    @Get('voltage-amperage')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @ApiOperation({ summary: 'Get voltage and amperage data for a date range (admin only).' })
    @ApiQuery({ name: 'startDate', type: String })
    @ApiQuery({ name: 'finishDate', type: String })
    @ApiResponse({ status: 200, description: 'Voltage and amperage data returned.' })
    async getVoltageAmperage(@Query() model: StartFinishDatesDto) {
        this.logger.info(`[${PowerDataController.name}].${this.getVoltageAmperage.name} => Start`);
        this.logger.debug(
            `[${PowerDataController.name}].${this.getVoltageAmperage.name} => ` +
                `Start Date: '${model.startDate}', Finis Date: '${model.finishDate}'`,
        );
        let data = [];

        const startDate = new Date(model.startDate);
        const finishDate = new Date(model.finishDate);

        data = await this.powerDataService.getVoltageAmperage(startDate, finishDate);

        this.logger.info(`[${PowerDataController.name}].${this.getVoltageAmperage.name} => Finish`);
        return data;
    }

    /**
     * Returns voltage data for the specified date range. Admin only.
     * @param startDateParam Start date (ISO string)
     * @param finishDateParam Finish date (ISO string)
     */
    @Get('voltage-data')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @ApiOperation({ summary: 'Get voltage data for a date range (admin only).' })
    @ApiQuery({ name: 'startDate', type: String })
    @ApiQuery({ name: 'finishDate', type: String })
    @ApiResponse({ status: 200, description: 'Voltage data returned.' })
    async getVoltageData(@Query() model: StartFinishDatesDto) {
        this.logger.info(`[${PowerDataController.name}].${this.getVoltageData.name} => Start`);
        this.logger.debug(
            `[${PowerDataController.name}].${this.getVoltageData.name} => ` +
                `Start Date: '${model.startDate}', Finis Date: '${model.finishDate}'`,
        );
        let data = [];
        const startDate = new Date(model.startDate);
        const finishDate = new Date(model.finishDate);
        finishDate.setTime(finishDate.getTime() + 24 * 60 * 60 * 1000 - 1);

        data = await this.powerDataService.getVoltageData(startDate, finishDate);

        this.logger.info(`[${PowerDataController.name}].${this.getVoltageData.name} => Finish`);
        return data;
    }

    /**
     * Returns power data aggregated by hour for the specified date range.
     * @param startDateParam Start date (ISO string)
     * @param finishDateParam Finish date (ISO string)
     */
    @Get('power-data-hourly')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Get power data aggregated by hour for a date range.' })
    @ApiQuery({ name: 'startDate', type: String })
    @ApiQuery({ name: 'finishDate', type: String })
    @ApiResponse({ status: 200, description: 'Hourly power data returned.' })
    async getPowerDataHourly(@Query() model: StartFinishDatesDto) {
        this.logger.info(`[${PowerDataController.name}].${this.getPowerDataHourly.name} => Start`);
        this.logger.debug(
            `[${PowerDataController.name}].${this.getPowerDataHourly.name} => ` +
                `Start Date: '${model.startDate}', Finis Date: '${model.finishDate}'`,
        );
        let data = [];
        const startDate = new Date(model.startDate);
        const finishDate = new Date(model.finishDate);
        data = await this.powerDataService.getPowerDataHourly(startDate, finishDate);
        this.logger.info(`[${PowerDataController.name}].${this.getPowerDataHourly.name} => Finish`);
        return data;
    }

    /**
     * Returns power data statistics for a given month and day of week.
     * @param month Month number (1-12)
     * @param dayOfWeek Day of week (1-7, Monday=1)
     */
    @Get('power-data-stats')
    @UseInterceptors(IgnoreTsCacheInterceptor)
    @CacheTTL(Intervals.OneDay)
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Get power data statistics for a given month and day of week.' })
    @ApiQuery({ name: 'month', type: Number, required: false })
    @ApiQuery({ name: 'day-of-week', type: Number, required: false })
    @ApiResponse({ status: 200, description: 'Power data statistics returned.' })
    async getPowerDataStats(@Query() model: MonthDayOfWeekDto) {
        this.logger.info(`[${PowerDataController.name}].${this.getPowerDataStats.name} => Start`);

        this.logger.debug(
            `[${PowerDataController.name}].${this.getPowerDataStats.name} => ` +
                `Month: '${model.month}', Day Of Week: '${model.dayOfWeek}'`,
        );

        const data = await this.powerDataService.getPowerDataStats(model.month, model.dayOfWeek);

        this.logger.info(`[${PowerDataController.name}].${this.getPowerDataStats.name} => Finish`);
        return data;
    }

    /**
     * Returns power data aggregated by day for the specified date range.
     * @param startDateParam Start date (ISO string)
     * @param finishDateParam Finish date (ISO string)
     */
    @Get('power-data-daily')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Get power data aggregated by day for a date range.' })
    @ApiQuery({ name: 'startDate', type: String })
    @ApiQuery({ name: 'finishDate', type: String })
    @ApiResponse({ status: 200, description: 'Daily power data returned.' })
    async getPowerDataDaily(@Query() model: StartFinishDatesDto) {
        this.logger.info(`[${PowerDataController.name}].${this.getPowerDataDaily.name} => Start`);
        this.logger.debug(
            `[${PowerDataController.name}].${this.getPowerDataDaily.name} => ` +
                `Start Date: '${model.startDate}', Finish Date: '${model.finishDate}'`,
        );
        let data = [];

        const startDate = new Date(model.startDate);
        const finishDate = new Date(model.finishDate);
        data = await this.powerDataService.getPowerDataDaily(startDate, finishDate);

        this.logger.info(`[${PowerDataController.name}].${this.getPowerDataDaily.name} => Finish`);
        return data;
    }

    /**
     * Returns power data aggregated by month for the specified date range.
     * @param startDateParam Start date (ISO string)
     * @param finishDateParam Finish date (ISO string)
     */
    @Get('power-data-monthly')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Get power data aggregated by month for a date range.' })
    @ApiQuery({ name: 'startDate', type: String })
    @ApiQuery({ name: 'finishDate', type: String })
    @ApiResponse({ status: 200, description: 'Monthly power data returned.' })
    async getPowerDataMonthly(@Query() model: StartFinishDatesDto) {
        this.logger.info(`[${PowerDataController.name}].${this.getPowerDataMonthly.name} => Start`);
        this.logger.debug(
            `[${PowerDataController.name}].${this.getPowerDataMonthly.name} => ` +
                `Start Date: '${model.startDate}', Finish Date: '${model.finishDate}'`,
        );
        let data = [];

        const startDate = new Date(model.startDate);
        const finishDate = new Date(model.finishDate);

        data = await this.powerDataService.getPowerDataMonthly(startDate, finishDate);

        this.logger.info(
            `[${PowerDataController.name}].${this.getPowerDataMonthly.name} => Finish`,
        );
        return data;
    }

    /**
     * Returns power data aggregated by year.
     */
    @Get('power-data-yearly')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Get power data aggregated by year.' })
    @ApiResponse({ status: 200, description: 'Yearly power data returned.' })
    async getPowerDataYearly() {
        this.logger.info(`[${PowerDataController.name}].${this.getPowerDataYearly.name} => Start`);
        const data = await this.powerDataService.getPowerDataYearly();
        this.logger.info(`[${PowerDataController.name}].${this.getPowerDataYearly.name} => Finish`);
        return data;
    }

    /**
     * Returns power availability data for the specified date range. Admin only.
     * @param startDateParam Start date (ISO string)
     * @param finishDateParam Finish date (ISO string)
     */
    @Get('power-availability')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @ApiOperation({ summary: 'Get power availability data for a date range (admin only).' })
    @ApiQuery({ name: 'startDate', type: String })
    @ApiQuery({ name: 'finishDate', type: String })
    @ApiResponse({ status: 200, description: 'Power availability data returned.' })
    async getPowerAvailabilityData(@Query() model: StartFinishDatesDto) {
        this.logger.info(
            `[${PowerDataController.name}].${this.getPowerAvailabilityData.name} => Start`,
        );
        this.logger.debug(
            `[${PowerDataController.name}].${this.getPowerAvailabilityData.name} => ` +
                `Start Date: '${model.startDate}', Finish Date: '${model.finishDate}'`,
        );
        let data = [];

        let startDate = new Date(model.startDate);
        const userTimezoneOffset = startDate.getTimezoneOffset() * 60000;
        let finishDate = new Date(model.finishDate);
        finishDate.setTime(finishDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        startDate = new Date(startDate.getTime() + userTimezoneOffset);
        finishDate = new Date(finishDate.getTime() + userTimezoneOffset);

        data = await this.powerDataService.getPowerAvailabilityData(startDate, finishDate);

        this.logger.info(
            `[${PowerDataController.name}].${this.getPowerAvailabilityData.name} => Finish`,
        );
        return data;
    }

    /**
     * Returns daily power availability data for a given year and month. Admin only.
     * @param yearParam Year (e.g., 2025)
     * @param monthParam Month (1-12)
     */
    @Get('power-availability-daily')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @ApiOperation({
        summary: 'Get daily power availability data for a year and month (admin only).',
    })
    @ApiQuery({ name: 'year', type: Number })
    @ApiQuery({ name: 'month', type: Number })
    @ApiResponse({ status: 200, description: 'Daily power availability data returned.' })
    async getPowerAvailabilityDailyData(@Query() model: MonthYearDto) {
        this.logger.info(
            `[${PowerDataController.name}].${this.getPowerAvailabilityDailyData.name} => Start`,
        );
        this.logger.debug(
            `[${PowerDataController.name}].${this.getPowerAvailabilityDailyData.name} => ` +
                `Year: '${model.year}, Month: '${model.month}'`,
        );
        let data = [];

        let startDate = new Date(model.year, model.month - 1, 1);
        const userTimezoneOffset = startDate.getTimezoneOffset() * 60000;
        let finishDate = new Date(
            model.year,
            model.month - 1,
            daysInMonth(model.year, model.month),
        );
        finishDate.setTime(finishDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        startDate = new Date(startDate.getTime() + userTimezoneOffset);
        finishDate = new Date(finishDate.getTime() + userTimezoneOffset);

        data = await this.powerDataService.getPowerAvailabilityDailyData(startDate, finishDate);

        this.logger.info(
            `[${PowerDataController.name}].${this.getPowerAvailabilityDailyData.name} => Finish`,
        );
        return data;
    }

    /**
     * Returns monthly power availability data for a given year. Admin only.
     * @param yearParam Year (e.g., 2025)
     */
    @Get('power-availability-monthly')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @ApiOperation({ summary: 'Get monthly power availability data for a year (admin only).' })
    @ApiQuery({ name: 'year', type: Number })
    @ApiResponse({ status: 200, description: 'Monthly power availability data returned.' })
    async getPowerAvailabilityMonthlyData(@Query() model: YearDto) {
        this.logger.info(
            `[${PowerDataController.name}].${this.getPowerAvailabilityMonthlyData.name} => Start`,
        );
        this.logger.debug(
            `[${PowerDataController.name}].${this.getPowerAvailabilityMonthlyData.name} => ` +
                `Year: '${model.year}'`,
        );
        let data = [];

        let startDate = new Date(model.year, 0, 1);
        const userTimezoneOffset = startDate.getTimezoneOffset() * 60000;
        let finishDate = new Date(model.year, 11, 31);
        finishDate.setTime(finishDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        startDate = new Date(startDate.getTime() + userTimezoneOffset);
        finishDate = new Date(finishDate.getTime() + userTimezoneOffset);

        data = await this.powerDataService.getPowerAvailabilityMonthlyData(startDate, finishDate);

        this.logger.info(
            `[${PowerDataController.name}].${this.getPowerAvailabilityMonthlyData.name} => Finish`,
        );
        return data;
    }

    /**
     * Returns yearly power availability data. Admin only.
     */
    @Get('power-availability-yearly')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @ApiOperation({ summary: 'Get yearly power availability data (admin only).' })
    @ApiResponse({ status: 200, description: 'Yearly power availability data returned.' })
    async getPowerAvailabilityYearlyData() {
        this.logger.info(
            `[${PowerDataController.name}].${this.getPowerAvailabilityYearlyData.name} => Start`,
        );
        let data = [];
        const now = new Date();
        const startDate = new Date(Constants.StartYear, 0, 1);
        const finishDate = new Date(now.getFullYear(), 11, 31);
        finishDate.setTime(finishDate.getTime() + 24 * 60 * 60 * 1000 - 1);

        data = await this.powerDataService.getPowerAvailabilityYearlyData(startDate, finishDate);
        this.logger.info(
            `[${PowerDataController.name}].${this.getPowerAvailabilityYearlyData.name} => Finish`,
        );
        return data;
    }
}
