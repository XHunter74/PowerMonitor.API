export class Constants {
    public static DefaultConfig = 'development.env';
    public static dataKeys = {
        sysInfo: 'sys-info',
        boardVersion: 'board-version',
        coefficients: 'coefficients',
    };
    public static rebootDuration = 90000;
    public static StartYear = 2019;
    public static NetworkWaitingDelay = 30000;
    public static PingDelay = 500;
    public static HashCostFactor = 10;
}

export class Intervals {
    public static OneSecond = 1000;
    public static OneMinute = 60 * 1000;
    public static OneHour = 60 * 60 * 1000;
    public static OneDay = 24 * 60 * 60 * 1000;
}

export class IntervalsInSeconds {
    public static OneMinute = 60;
    public static OneHour = 60 * 60;
    public static OneDay = 24 * 60 * 60;
}
