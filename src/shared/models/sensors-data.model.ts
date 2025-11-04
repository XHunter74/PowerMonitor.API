export class SensorsDataModel {
    voltage = 0;
    amperage = 0;
    power = 0;

    constructor(voltage: number, amperage: number, powerCoefficient: number) {
        if (voltage) {
            this.voltage = voltage;
        }
        if (amperage) {
            this.amperage = amperage;
        }
        if (voltage && amperage) {
            this.power = (voltage * amperage * powerCoefficient) / (60 * 60);
        }
    }
}
