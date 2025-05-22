export class SysInfoModel {
    version: string;
    manufacturer: string;
    model: string;
    platform: string;
    distro: string;
    cpuManufacturer: string;
    cpuBrand: string;
    cpuSpeed: number;
    cpuCores: number;
    systemUptime: SystemUptime;
    systemDateTimeStr: string;
}

export class SystemUptime {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}
