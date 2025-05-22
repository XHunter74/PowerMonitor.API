export class SerialDataModel {
    type: 'data' | 'coefficients' | 'info';
    voltage: number;
    current: number;
    power: number;
    powerFactor: number;
    version: string;
    date: string;
}
