export class SensorsDataModel {
    voltage = 0;
    amperage = 0;
    power = 0;
    frequency = 0;
    energyMeteringData = 0;

    constructor(
        voltage: number,
        amperage: number,
        power: number,
        frequency: number,
        energyMeteringData: number,
        powerCoefficient: number,
    ) {
        if (voltage) {
            this.voltage = voltage;
        }
        if (amperage) {
            this.amperage = amperage;
        }
        if (power) {
            if (power < 0) {
                power = 0;
            }
            this.power = power * powerCoefficient;
        }
        if (frequency) {
            this.frequency = frequency;
        }
        if (energyMeteringData) {
            this.energyMeteringData = energyMeteringData;
        }
    }
}
