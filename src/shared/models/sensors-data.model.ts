export class SensorsDataModel {
    voltage = 0;
    amperage = 0;
    power = 0;

    constructor(
        voltage: number,
        amperage: number,
        power: number,
        frequency: number,
        powerCoefficient: number,
    ) {
        if (voltage) {
            this.voltage = voltage;
        }
        if (amperage) {
            this.amperage = amperage;
        }
        if (power) {
            this.power = (power * powerCoefficient) / (60 * 60);
        }
    }
}
