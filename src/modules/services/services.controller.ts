import { Controller, Get, UseGuards, Post, Body, Inject, Injectable } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { Logger } from 'winston';
import { ServicesService } from './services.service';
import { AuthGuard } from '@nestjs/passport';
import { CoefficientsModel } from '../../common/models/coefficients.model';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Services')
@Controller('api/services')
export class ServicesController {

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly servicesService: ServicesService,
    ) { }

    /**
     * Returns system information for the device.
     */
    @Get('sysinfo')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Get system information for the device.' })
    @ApiResponse({ status: 200, description: 'System information returned successfully.' })
    async getSysInfo() {
        this.logger.info(`[${ServicesController.name}].${this.getSysInfo.name} => Start`);
        const data = await this.servicesService.getSystemInfo();
        this.logger.debug(`[${ServicesController.name}].${this.getSysInfo.name} => ` +
            `System Info: '${JSON.stringify(data)}'`);
        this.logger.info(`[${ServicesController.name}].${this.getSysInfo.name} => Finish`);
        return data;
    }

    /**
     * Returns the board firmware build date.
     */
    @Get('board-build-date')
    @UseGuards(AuthGuard('jwt'))
    @ApiOperation({ summary: 'Get the board firmware build date.' })
    @ApiResponse({ status: 200, description: 'Board firmware build date returned successfully.' })
    async getSketchBuildDate() {
        this.logger.info(`[${ServicesController.name}].${this.getSketchBuildDate.name} => Start`);
        const versionInfo = await this.servicesService.getSketchBuildDate();
        this.logger.debug(`[${ServicesController.name}].${this.getSketchBuildDate.name} => ` +
            `Version Info: '${JSON.stringify(versionInfo)}'`);
        this.logger.info(`[${ServicesController.name}].${this.getSketchBuildDate.name} => Finish`);
        return versionInfo;
    }

    /**
     * Returns the calibration coefficients for the device. Admin only.
     */
    @Get('calibration-coefficients')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @ApiOperation({ summary: 'Get the calibration coefficients for the device. Admin only.' })
    @ApiResponse({ status: 200, description: 'Calibration coefficients returned successfully.' })
    async getCalibrationCoefficients() {
        this.logger.info(`[${ServicesController.name}].${this.getCalibrationCoefficients.name} => Start`);
        const coefficients = await this.servicesService.getCalibrationCoefficients();
        this.logger.debug(`[${ServicesController.name}].${this.getCalibrationCoefficients.name} => ` +
            `Calibration Coefficients: '${JSON.stringify(coefficients)}'`);
        this.logger.info(`[${ServicesController.name}].${this.getCalibrationCoefficients.name} => Finish`);

        return coefficients;
    }

    /**
     * Sets the calibration coefficients for the device. Admin only.
     * @param coefficients Calibration coefficients model
     */
    @Post('calibration-coefficients')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @ApiOperation({ summary: 'Set the calibration coefficients for the device. Admin only.' })
    @ApiBody({ type: CoefficientsModel })
    @ApiResponse({ status: 201, description: 'Calibration coefficients set successfully.' })
    async setCalibrationCoefficients(@Body() coefficients: CoefficientsModel) {
        this.logger.info(`[${ServicesController.name}].${this.setCalibrationCoefficients.name} => Start`);
        // if (coefficients) {
        //     const coefficients = <CoefficientsModel>req.body;
        //     var collectDataService = DIContainer.get<CollectDataService>(CollectDataService);
        //     res.send();
        // } else {
        //     return new Inter"Incorrect input data" });
        // }
        this.logger.info(`[${ServicesController.name}].${this.setCalibrationCoefficients.name} => Finish`);
    }

    /**
     * Health check endpoint. Returns 'pong'.
     */
    @Post('ping')
    @ApiOperation({ summary: 'Health check endpoint. Returns pong.' })
    @ApiResponse({ status: 201, description: 'Pong returned.' })
    ping() {
        return { response: 'pong' };
    }

    // static setBoardCoefficients = async (req: Request, res: Response) => {
    //     if (req.body) {
    //         const coefficients = <BoardCoefficientsModel>req.body;
    //         var collectDataService = DIContainer.get<CollectDataService>(CollectDataService);
    //         collectDataService.setBoardCoefficients(coefficients);
    //         collectDataService.requestCoefficients();
    //         const subscription = collectDataService.calibrationCoefficients.subscribe(coefficientsModel => {
    //             res.send(coefficientsModel);
    //             subscription.unsubscribe();
    //         })
    //     } else {
    //         res.status(500).send({ error: "Incorrect input data" });
    //     }

    // }

    // static uploadSketch = async (req: Request, res: Response) => {
    //     if (req.body && req.file) {
    //         var updateBoardService = DIContainer.get<UpdateBoardService>(UpdateBoardService);
    //         try {
    //             await updateBoardService.flushBoard(req.file);
    //             res.status(200).send();
    //         }
    //         catch (e) {
    //             res.status(500).send({ error: e });
    //         }
    //     } else {
    //         res.status(500).send({ error: "Incorrect input data" });
    //     }

    // }
}
