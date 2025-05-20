import { Injectable } from '@nestjs/common';
import { PowerDataStatsModel } from '../../common/models/power-data-stats.model';
import { InjectRepository } from '@nestjs/typeorm';
import { VoltageAmperageData } from '../../entities/voltage-amperage-data.entity';
import { Repository } from 'typeorm';
import { PowerData } from '../../entities/power-data.entity';
import { PowerAvailability } from '../../entities/power-availability.entity';
import { Constants } from '../../constants';
import { VoltageData } from '../../entities/voltage-data.entity';
import { LogMethod } from '../../common/decorators/log-method.decorator';

@Injectable()
export class PowerDataService {

    constructor(
        @InjectRepository(VoltageAmperageData)
        private readonly voltageAmperageRepository: Repository<VoltageAmperageData>,
        @InjectRepository(VoltageData)
        private readonly voltageRepository: Repository<VoltageData>,
        @InjectRepository(PowerData)
        private readonly powerDataRepository: Repository<PowerData>,
        @InjectRepository(PowerAvailability)
        private readonly powerAvailabilityRepository: Repository<PowerAvailability>,
    ) { }

    @LogMethod()
    async getPowerDataStats(month: number, dayOfWeek: number): Promise<PowerDataStatsModel[]> {
        if (dayOfWeek === 7) {
            dayOfWeek = 0;
        }
        const result = await this.powerDataRepository
            .createQueryBuilder('record')
            .select([
                'EXTRACT(month FROM record.created) AS month',
                'CASE WHEN EXTRACT(dow FROM record.created) = 0 THEN 7 ELSE EXTRACT(dow FROM record.created) END AS day_of_week',
                'record.hours',
                'ROUND(SUM(record.power) / COUNT(*) / 1000, 2) AS power'
            ])
            .where('record.power > 0')
            .andWhere('record.created <> CURRENT_DATE')
            .andWhere('EXTRACT(month FROM record.created) = :month', { month })
            .andWhere('EXTRACT(dow FROM record.created) = :dayOfWeek', { dayOfWeek })
            .groupBy('month, day_of_week, record.hours')
            .orderBy('month, day_of_week, record.hours')
            .getRawMany();
        return result.map(e => new PowerDataStatsModel(e.month, e.day_of_week, e.hours, Number(e.power)));
    }

    @LogMethod()
    async getPowerDataHourly(startDate: Date, finishDate: Date, options?: { suppressLogging?: boolean }): Promise<any[]> {
        const records = await this.powerDataRepository
            .createQueryBuilder('record')
            .where('record.created >= :startDate and record.created <= :finishDate', { startDate, finishDate })
            .orderBy('record.created', 'ASC')
            .addOrderBy('record.hours', 'ASC')
            .getMany();
        return records.map(record => ({
            created: record.created,
            hours: record.hours,
            power: Math.round(record.power / 1000 * 100) / 100,
        }));
    }

    @LogMethod()
    async getPowerDataDaily(startDate: Date, finishDate: Date, options?: { suppressLogging?: boolean }): Promise<any[]> {
        const records = await this.powerDataRepository
            .createQueryBuilder('record')
            .select('record.created, SUM(record.power) as power')
            .groupBy('record.created')
            .where('record.created >= :startDate and record.created <= :finishDate', { startDate, finishDate })
            .orderBy('record.created', 'ASC')
            .getRawMany();
        return records.map(record => ({
            created: record['created'],
            power: Math.round(record['power'] / 1000 * 100) / 100,
        }));
    }

    async getPowerDataMonthly(startDate: Date, finishDate: Date): Promise<any[]> {
        const records = await this.powerDataRepository
            .createQueryBuilder('record')
            .select('EXTRACT(month from record.created) as month, EXTRACT(year from record.created) as year')
            .addSelect('SUM(record.power) as power')
            .groupBy('EXTRACT(month from record.created), EXTRACT(year from record.created)')
            .where('record.created >= :startDate and record.created <= :finishDate')
            .orderBy('EXTRACT(month from record.created), EXTRACT(year from record.created)', 'ASC')
            .setParameters({ startDate, finishDate })
            .getRawMany();

        const data = records.map(record => {
            return {
                year: record['year'],
                month: record['month'],
                power: Math.round(record['power'] / 1000 * 100) / 100,
            };
        });
        return data;
    }

    async getPowerDataYearly(): Promise<any[]> {
        const records = await this.powerDataRepository
            .createQueryBuilder('record')
            .select('EXTRACT(year from record.created) as year')
            .addSelect('SUM(record.power) as power')
            .groupBy('EXTRACT(year from record.created)')
            .orderBy('EXTRACT(year from record.created)', 'ASC')
            .getRawMany();

        const data = records.map(record => {
            return {
                year: record['year'],
                month: record['month'],
                power: Math.round(record['power'] / 1000 * 100) / 100,
            };
        });
        return data;
    }

    async getPowerAvailabilityData(startDate: Date, finishDate: Date): Promise<any[]> {
        let startRequestDate = new Date(startDate);
        startRequestDate.setDate(startRequestDate.getDate() - 1);
        let finishRequestDate = new Date(finishDate);
        finishRequestDate.setDate(finishRequestDate.getDate() + 1);
        let records = await this.powerAvailabilityRepository
            .createQueryBuilder('record')
            .where('record.created >= :startDate and record.created <= :finishDate')
            .orderBy('record.created', 'ASC')
            .setParameters({ startDate: startRequestDate, finishDate: finishRequestDate })
            .getMany();

        let startRecords = records.map(record => {
            return {
                id: record.id,
                type: 'S',
                eventDate: record.created,
            };
        });

        records = await this.powerAvailabilityRepository
            .createQueryBuilder('record')
            .where('record.updated >= :startDate and record.updated <= :finishDate')
            .orderBy('record.updated', 'ASC')
            .setParameters({ startDate: startRequestDate, finishDate: finishRequestDate })
            .getMany();

        const finishRecords = records.map(record => {
            return {
                id: record.id,
                type: 'F',
                eventDate: record.updated,
            };
        });
        startRecords = startRecords.concat(finishRecords);
        startRecords = startRecords.sort((a, b) => powerDataSorter(a, b));
        if (startRecords.length > 0 && startRecords[0].type === 'S') {
            startRecords.push({
                id: 0,
                type: 'F',
                eventDate: startRequestDate,
            });
        }
        startRecords = startRecords.sort((a, b) => powerDataSorter(a, b));
        if (startRecords.length >= 2) {
            const data = [];
            for (let i = 1; i < startRecords.length; i = i + 2) {
                let finishDateInt = startRecords[i].eventDate.getTime() - Constants.rebootDuration;
                if (finishDateInt < startRecords[i - 1].eventDate.getTime()) {
                    finishDateInt = startRecords[i - 1].eventDate.getTime();
                }
                const startDateInt = startRecords[i - 1].eventDate.getTime();
                data.push(
                    {
                        start: startRecords[i - 1].eventDate,
                        finish: new Date(finishDateInt),
                        month: new Date(startDateInt).getMonth() + 1,
                        year: new Date(startDateInt).getFullYear(),
                        day: new Date(startDateInt).getDate(),
                        duration: finishDateInt - startDateInt,
                    },
                );
            }
            let result = [];
            for (let item of data) {
                const start = item.start.getFullYear() * 365 + item.start.getMonth() * 30 + item.start.getDate();
                const finish = item.finish.getFullYear() * 365 + item.finish.getMonth() * 30 + item.finish.getDate();
                if (start === finish) {
                    result.push(item);
                } else {
                    const todayItem = { ...item };
                    const finishDate = new Date(item.start.getFullYear(), item.start.getMonth(), item.start.getDate(), 23, 59, 59, 999);
                    todayItem.finish = finishDate;
                    todayItem.duration = finishDate.getTime() - item.start.getTime();
                    result.push(todayItem);
                    const startDate = new Date(item.finish.getFullYear(), item.finish.getMonth(), item.finish.getDate(), 0, 0, 0, 0);
                    const tomorrowItem = {
                        start: startDate,
                        finish: item.finish,
                        month: startDate.getMonth() + 1,
                        year: startDate.getFullYear(),
                        day: startDate.getDate(),
                        duration: item.finish.getTime() - startDate.getTime(),
                    };
                    result.push(tomorrowItem);
                }
            }
            result = result.filter(e => new Date(e.year, e.month - 1, e.day) >= startDate && new Date(e.year, e.month - 1, e.day) <= finishDate);
            return result;
        } else {
            return [];
        }
    }

    async getPowerAvailabilityDailyData(startDate: Date, finishDate: Date): Promise<any[]> {
        const data = (await this.getPowerAvailabilityData(startDate, finishDate))
            .reduce((a, b) => {
                let current = a.find(e => (e.year * 365 + e.month * 30 + e.day) === (b.year * 365 + b.month * 30 + b.day));
                if (current) {
                    current.duration = current.duration + b.duration;
                    current.events = current.events + 1;
                } else {
                    current = {
                        month: b.month,
                        year: b.year,
                        day: b.day,
                        duration: b.duration,
                        events: 1,
                    };
                    a.push(current);
                }
                return a;
            }, []);

        return data;
    }

    async getPowerAvailabilityMonthlyData(startDate: Date, finishDate: Date): Promise<any[]> {
        const data = (await this.getPowerAvailabilityData(startDate, finishDate))
            .reduce((a, b) => {
                let current = a.find(e => e.month === b.month && e.year === b.year);
                if (current) {
                    current.duration = current.duration + b.duration;
                    current.events = current.events + 1;
                } else {
                    current = {
                        month: b.month,
                        year: b.year,
                        duration: b.duration,
                        events: 1,
                    };
                    a.push(current);
                }
                return a;
            }, []);

        return data;
    }

    async getPowerAvailabilityYearlyData(startDate: Date, finishDate: Date): Promise<any[]> {
        const data = (await this.getPowerAvailabilityData(startDate, finishDate))
            .reduce((a, b) => {
                let current = a.find(e => e.year === b.year);
                if (current) {
                    current.duration = current.duration + b.duration;
                    current.events = current.events + 1;
                } else {
                    current = {
                        year: b.year,
                        duration: b.duration,
                        events: 1,
                    };
                    a.push(current);
                }
                return a;
            }, []);

        return data;
    }

    async getVoltageAmperage(startDate: Date, finishDate: Date): Promise<any[]> {
        const records = await this.voltageAmperageRepository
            .createQueryBuilder('record')
            .where('record.created >= :startDate and record.created <= :finishDate')
            .orderBy('record.created, record.hours', 'ASC')
            .setParameters({ startDate, finishDate })
            .getMany();

        const data = records.map(record => {
            return {
                created: record.created,
                hours: record.hours,
                amperageMin: record.amperageMin,
                amperageMax: record.amperageMax,
                amperageAvg: Math.round(record.amperageSum / record.samples * 100) / 100,
                voltageMin: record.voltageMin,
                voltageMax: record.voltageMax,
                voltageAvg: Math.round(record.voltageSum / record.samples * 100) / 100,
            };
        });
        return data;
    }

    async getVoltageData(startDate: Date, finishDate: Date): Promise<any[]> {
        const records = await this.voltageRepository
            .createQueryBuilder('record')
            .where('record.created >= :startDate and record.created <= :finishDate')
            .orderBy('record.created', 'ASC')
            .setParameters({ startDate, finishDate })
            .getMany();

        const data = records.map(record => {
            return {
                created: record.created,
                voltage: record.voltage
            };
        });
        return data;
    }

}

function compare(a: number | string | Date, b: number | string | Date, isAsc: boolean) {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
}

function powerDataSorter(a: any, b: any) {
    let result = compare(a.eventDate, b.eventDate, true);
    if (a.eventDate.getTime() === b.eventDate.getTime()) {
        result = a.type < b.type ? 1 : -1;
    }
    return result;
}
