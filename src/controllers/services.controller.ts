import { Controller, Get, UseGuards, Post, Body, Inject, Injectable } from '@nestjs/common';
import { WINSTON_LOGGER } from '../modules/logger.module';
import { Logger } from 'winston';
import { ServicesService } from '../services/services.service';
import { AuthGuard } from '@nestjs/passport';
import { CoefficientsModel } from '../models/coefficients.model';
import { RolesGuard } from '../guards/roles.guard';

@Controller('api/services')
export class ServicesController {

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly servicesService: ServicesService,
    ) { }

    @Get('sysinfo')
    @UseGuards(AuthGuard('jwt'))
    async getSysInfo() {
        this.logger.info(`[${ServicesController.name}].${this.getSysInfo.name} => Start`);
        const data = await this.servicesService.getSystemInfo();
        this.logger.debug(`[${ServicesController.name}].${this.getSysInfo.name} => ` +
            `System Info: '${JSON.stringify(data)}'`);
        this.logger.info(`[${ServicesController.name}].${this.getSysInfo.name} => Finish`);
        return data;
    }

    @Get('board-build-date')
    @UseGuards(AuthGuard('jwt'))
    async getSketchBuildDate() {
        this.logger.info(`[${ServicesController.name}].${this.getSketchBuildDate.name} => Start`);
        const versionInfo = await this.servicesService.getSketchBuildDate();
        this.logger.debug(`[${ServicesController.name}].${this.getSketchBuildDate.name} => ` +
            `Version Info: '${JSON.stringify(versionInfo)}'`);
        this.logger.info(`[${ServicesController.name}].${this.getSketchBuildDate.name} => Finish`);
        return versionInfo;
    }

    @Get('calibration-coefficients')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    async getCalibrationCoefficients() {
        this.logger.info(`[${ServicesController.name}].${this.getCalibrationCoefficients.name} => Start`);
        const coefficients = await this.servicesService.getCalibrationCoefficients();
        this.logger.debug(`[${ServicesController.name}].${this.getCalibrationCoefficients.name} => ` +
            `Calibration Coefficients: '${JSON.stringify(coefficients)}'`);
        this.logger.info(`[${ServicesController.name}].${this.getCalibrationCoefficients.name} => Finish`);

        return coefficients;
    }

    @Post('calibration-coefficients')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
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

    @Post('ping')
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
