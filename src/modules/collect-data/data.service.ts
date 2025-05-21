import { Repository } from 'typeorm';
import { ServerData } from '../../entities/server-data.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { SensorsData } from '../../common/models/sensors-data';
import { VoltageAmperageData } from '../../entities/voltage-amperage-data.entity';
import { PowerData } from '../../entities/power-data.entity';
import { CoefficientsModel } from '../../common/models/coefficients.model';
import { Constants } from '../../constants';
import { VersionModel } from '../../common/models/version.model';
import { Injectable } from '@nestjs/common';
import { PowerAcc } from '../../entities/power-acc.entity';
import { VoltageData } from '../../entities/voltage-data.entity';

@Injectable()
export class DataService {
    constructor(
        @InjectRepository(ServerData)
        private serverDataRepository: Repository<ServerData>,
        @InjectRepository(VoltageAmperageData)
        private voltageAmperageRepository: Repository<VoltageAmperageData>,
        @InjectRepository(VoltageData)
        private voltageRepository: Repository<VoltageData>,
        @InjectRepository(PowerData)
        private powerDataRepository: Repository<PowerData>,
        @InjectRepository(PowerAcc)
        private powerAccRepository: Repository<PowerAcc>,
    ) {}

    public async processVoltageData(data: SensorsData) {
        if (data.amperage && data.voltage) {
            const currentDate = new Date();
            const voltageData = new VoltageData();
            voltageData.created = currentDate;
            voltageData.voltage = data.voltage;
            await this.voltageRepository.save(voltageData);
        }
    }

    public async processVoltageAmperageData(data: SensorsData) {
        if (data.amperage && data.voltage) {
            const currentDate = new Date();
            const today = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate(),
            );

            let voltageAmperageData = await this.voltageAmperageRepository.findOne({
                where: { created: today, hours: currentDate.getHours() },
            });

            if (!voltageAmperageData) {
                voltageAmperageData = new VoltageAmperageData();
            }

            voltageAmperageData.amperageSum = voltageAmperageData.amperageSum + data.amperage;
            voltageAmperageData.samples = voltageAmperageData.samples + 1;
            if (
                (data.amperage > 0 && voltageAmperageData.amperageMin === 0) ||
                voltageAmperageData.amperageMin > data.amperage
            ) {
                voltageAmperageData.amperageMin = data.amperage;
            }
            if (
                voltageAmperageData.amperageMax === 0 ||
                voltageAmperageData.amperageMax < data.amperage
            ) {
                voltageAmperageData.amperageMax = data.amperage;
            }
            voltageAmperageData.voltageSum = voltageAmperageData.voltageSum + data.voltage;
            if (
                (data.voltage > 0 && voltageAmperageData.voltageMin === 0) ||
                voltageAmperageData.voltageMin > data.voltage
            ) {
                voltageAmperageData.voltageMin = data.voltage;
            }
            if (
                voltageAmperageData.voltageMax === 0 ||
                voltageAmperageData.voltageMax < data.voltage
            ) {
                voltageAmperageData.voltageMax = data.voltage;
            }

            voltageAmperageData.updated = currentDate;

            await this.voltageAmperageRepository.save(voltageAmperageData);
        }
    }

    public async processPowerData(data: SensorsData) {
        if (data.power) {
            const currentDate = new Date();
            const today = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate(),
            );

            let powerData = await this.powerDataRepository.findOne({
                where: { created: today, hours: currentDate.getHours() },
            });

            if (!powerData) {
                powerData = new PowerData();
            }

            powerData.power = powerData.power + data.power;
            powerData.updated = currentDate;

            await this.powerDataRepository.save(powerData);

            const powerAcc = await this.powerAccRepository.findOne({
                where: {},
                order: { id: 'DESC' },
            });
            if (powerAcc) {
                powerAcc.powerAcc = data.power + powerAcc.powerAcc;
                powerAcc.updated = currentDate;
                await this.powerAccRepository.save(powerAcc);
            }
        }
    }

    public async processCalibrationCoefficientsData(coefficients: CoefficientsModel) {
        await this.setServerData(Constants.dataKeys.coefficients, coefficients);
    }

    async processBoardVersionData(versionData: VersionModel) {
        await this.setServerData(Constants.dataKeys.boardVersion, versionData);
    }

    async getServerData(key: string): Promise<ServerData> {
        const dataRec = await this.serverDataRepository.findOne({ where: { key: key } });
        return dataRec;
    }

    async setServerData(key: string, data: any) {
        let dataRec = await this.serverDataRepository.findOne({ where: { key: key } });
        if (!dataRec) {
            dataRec = new ServerData();
            dataRec.key = key;
        }
        dataRec.data = JSON.stringify(data);
        dataRec.updated = new Date();
        await this.serverDataRepository.save(dataRec);
    }
}
