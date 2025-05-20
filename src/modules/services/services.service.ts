import { SysInfoModel, SystemUptime } from '../../common/models/sys-info.model';
import { patchDate } from '../../date-functions';
import { DataService } from '../collect-data/data.service';
import { Constants } from '../../constants';
import { Injectable } from '@nestjs/common';
import { CoefficientsModel } from '../../common/models/coefficients.model';
import { environment } from '../../environments';

@Injectable()
export class ServicesService {

    private sysInfoData: SysInfoModel;

    constructor(
        private readonly dataService: DataService,
    ) { }

    async getSystemInfo(): Promise<SysInfoModel> {
        patchDate();
        if (!this.sysInfoData) {
            const si = require('systeminformation');
            const sysInfo = await si.getStaticData();
            this.sysInfoData = new SysInfoModel();
            this.sysInfoData.version = environment.version;
            this.sysInfoData.manufacturer = sysInfo.system.manufacturer;
            this.sysInfoData.model = sysInfo.system.model;
            this.sysInfoData.platform = sysInfo.os.platform;
            this.sysInfoData.distro = sysInfo.os.distro;
            this.sysInfoData.cpuManufacturer = sysInfo.cpu.manufacturer;
            this.sysInfoData.cpuBrand = sysInfo.cpu.brand;
            this.sysInfoData.cpuSpeed = sysInfo.cpu.speed;
            this.sysInfoData.cpuCores = sysInfo.cpu.cores;
            this.sysInfoData.systemUptime = getSystemUptime();
        }
        this.sysInfoData.systemUptime = getSystemUptime();
        this.sysInfoData.systemDateTimeStr = new Date().toISOString();
        return this.sysInfoData;
    }

    async getSketchBuildDate(): Promise<any> {
        const versionRec = await this.dataService.getServerData(Constants.dataKeys.boardVersion);
        if (!versionRec) {
            return null;
        } else {
            return JSON.parse(versionRec.data);
        }
    }

    async getCalibrationCoefficients(): Promise<CoefficientsModel> {
        const boardSettingsRec = await this.dataService.getServerData(Constants.dataKeys.coefficients);
        let coefficientsModel: CoefficientsModel;
        if (!boardSettingsRec) {
            coefficientsModel = new CoefficientsModel();
            coefficientsModel.currentCalibration = 1;
            coefficientsModel.voltageCalibration = 1;
        } else {
            coefficientsModel = JSON.parse(boardSettingsRec.data);
        }
        return coefficientsModel;
    }

    async getSystemUptimeSeconds(): Promise<number> {
        const uptimeData = getSystemUptime();
        const result = uptimeData.days * 24 * 60 * 60 + uptimeData.hours * 60 * 60 +
            uptimeData.minutes * 60 + uptimeData.seconds;
        return result;
    }
}

function getSystemUptime(): SystemUptime {
    const uptime = require('os-uptime');
    const startDate = uptime();
    const interval = new Date().getTime() - startDate.getTime();
    const systemUptime = intervalToSystemUptime(interval);
    return systemUptime;
}

function intervalToSystemUptime(interval: number): SystemUptime {
    const result = new SystemUptime();
    const oneDay = 1000 * 60 * 60 * 24;
    result.days = Math.floor(interval / oneDay);
    interval = interval - result.days * oneDay;
    const oneHour = 1000 * 60 * 60;
    result.hours = Math.floor(interval / oneHour);
    interval = interval - result.hours * oneHour;
    const oneMinute = 1000 * 60;
    result.minutes = Math.floor(interval / oneMinute);
    interval = interval - result.minutes * oneMinute;
    result.seconds = Math.floor(interval / 1000);
    return result;
}
