export class SensorsDataModel {
    voltage = 0;
    amperage = 0;
    power = 0;

    constructor(voltage: number, amperage: number, power: number, powerCoefficient: number) {
        if (voltage) {
            this.voltage = voltage;
        }
        this.power = (voltage * amperage * powerCoefficient) / (60 * 60);
        if (amperage) {
            this.amperage = amperage;
        }
    }
}
