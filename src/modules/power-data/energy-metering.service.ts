import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeterDataDto } from '../../common/models/dto/meter-data.dto';
import { FactualDataDto } from '../../common/models/dto/factual-data.dto';
import { PowerAcc } from '../../entities/power-acc.entity';
import { ConfigService } from '../config/config.service';

@Injectable()
export class EnergyMeteringService {
    constructor(
        private readonly config: ConfigService,
        @InjectRepository(PowerAcc)
        private readonly powerAccRepository: Repository<PowerAcc>,
    ) {}

    async getPowerMeterData(): Promise<MeterDataDto[]> {
        const records = await this.powerAccRepository
            .createQueryBuilder('e')
            .orderBy('e.created', 'ASC')
            .getMany();
        if (records.length === 0) {
            return [];
        }
        let result: MeterDataDto[] = [];
        for (let i = 0; i < records.length; i++) {
            const newRecord = new MeterDataDto();
            newRecord.id = records[i].id;
            newRecord.monitorData = +(
                records[i].startValue +
                Math.round((records[i].powerAcc / 1000) * 10) / 10
            ).toFixed(1);
            newRecord.coefficient = records[i].coefficient;
            newRecord.eventDate = records[i].updated;
            const next = i + 1;
            if (next < records.length) {
                newRecord.factualData = records[next].startValue;
                newRecord.difference = +(newRecord.factualData - newRecord.monitorData).toFixed(1);
            }
            result.push(newRecord);
        }
        result = result.sort((a, b) => {
            if (a.eventDate > b.eventDate) {
                return -1;
            }
            if (a.eventDate < b.eventDate) {
                return 1;
            }
            return 0;
        });
        return result;
    }

    public async getCurrentPowerConsumptionData(): Promise<number> {
        const powerAcc = await this.powerAccRepository.findOne({
            where: {},
            order: { id: 'DESC' },
        });
        if (powerAcc) {
            const result = powerAcc.startValue + Math.round((powerAcc.powerAcc / 1000) * 10) / 10;
            return result;
        } else {
            return 0;
        }
    }

    async addNewFactualData(factualData: FactualDataDto): Promise<PowerAcc> {
        let newData = new PowerAcc();
        newData.created = new Date();
        newData.startValue = factualData.value;
        newData.coefficient = this.config.powerCoefficient;
        newData = await this.powerAccRepository.save(newData);
        return newData;
    }

    async updatePowerCoefficient() {
        const lastRecord = await this.powerAccRepository
            .createQueryBuilder('e')
            .orderBy('e.created', 'DESC')
            .getOne();
        if (lastRecord == null) {
            return;
        }
        if (lastRecord.coefficient !== this.config.powerCoefficient) {
            let newData = new PowerAcc();
            newData.created = new Date();
            newData.startValue =
                Math.round((lastRecord.startValue + lastRecord.powerAcc / 1000) * 10) / 10;
            newData.coefficient = this.config.powerCoefficient;
            newData = await this.powerAccRepository.save(newData);
        }
    }

    async deleteFactualData(recordId: number) {
        const deleteResult = await this.powerAccRepository.delete(recordId);
        if (deleteResult.affected === 0) {
            throw new HttpException('Record not found', HttpStatus.NOT_FOUND);
        }
    }
}
