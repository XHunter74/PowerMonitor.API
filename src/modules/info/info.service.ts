import { SysInfoModel, SystemUptime } from '../../shared/models/sys-info.model';
import { patchDate } from '../../shared/utils/date-functions';
import { DataService } from '../collect-data/data.service';
import { Constants, Intervals, IntervalsInSeconds } from '../../config/constants';
import { Injectable } from '@nestjs/common';
import { CoefficientsModel } from '../../shared/models/coefficients.model';
import { environment } from '../../config/environments';
import * as si from 'systeminformation';
import * as uptime from 'os-uptime';

@Injectable()
export class InfoService {
    private sysInfoData: SysInfoModel;

    constructor(private readonly dataService: DataService) {}

    async getSystemInfo(): Promise<SysInfoModel> {
        patchDate();
        if (!this.sysInfoData) {
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
            this.sysInfoData.systemUptime = this.getSystemUptime();
        }
        this.sysInfoData.systemUptime = this.getSystemUptime();
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
        const boardSettingsRec = await this.dataService.getServerData(
            Constants.dataKeys.coefficients,
        );
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

    getSystemUptimeSeconds(): number {
        const uptimeData = this.getSystemUptime();
        const result =
            uptimeData.days * IntervalsInSeconds.OneDay +
            uptimeData.hours * IntervalsInSeconds.OneHour +
            uptimeData.minutes * IntervalsInSeconds.OneMinute +
            uptimeData.seconds;
        return result;
    }

    protected getSystemUptime(): SystemUptime {
        const startDate = uptime();
        const interval = new Date().getTime() - startDate.getTime();
        return this.intervalToSystemUptime(interval);
    }

    protected intervalToSystemUptime(interval: number): SystemUptime {
        const result = new SystemUptime();
        result.days = Math.floor(interval / Intervals.OneDay);
        interval = interval - result.days * Intervals.OneDay;
        result.hours = Math.floor(interval / Intervals.OneHour);
        interval = interval - result.hours * Intervals.OneHour;
        result.minutes = Math.floor(interval / Intervals.OneMinute);
        interval = interval - result.minutes * Intervals.OneMinute;
        result.seconds = Math.floor(interval / Intervals.OneSecond);
        return result;
    }
}
