import { Injectable, Inject } from '@nestjs/common';
import { PowerDataStatsModel } from '../../shared/models/power-data-stats.model';
import { InjectRepository } from '@nestjs/typeorm';
import { VoltageAmperageData } from '../../entities/voltage-amperage-data.entity';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PowerData } from '../../entities/power-data.entity';
import { PowerAvailability } from '../../entities/power-availability.entity';
import { Constants } from '../../config/constants';
import { VoltageData } from '../../entities/voltage-data.entity';
import { LogMethod } from '../../shared/decorators/log-method.decorator';

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
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

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
                'record.hours AS hours',
                'ROUND(SUM(record.power) / COUNT(*) / 1000, 2) AS power',
            ])
            .where('record.power > 0')
            .andWhere('record.created <> CURRENT_DATE')
            .andWhere('EXTRACT(month FROM record.created) = :month', { month })
            .andWhere('EXTRACT(dow FROM record.created) = :dayOfWeek', { dayOfWeek })
            .groupBy('month, day_of_week, record.hours')
            .orderBy('month, day_of_week, record.hours')
            .getRawMany();
        return result.map(
            (e) => new PowerDataStatsModel(e.month, e.day_of_week, e.hours, Number(e.power)),
        );
    }

    @LogMethod()
    async getPowerDataHourly(
        startDate: Date,
        finishDate: Date,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options?: { suppressLogging?: boolean },
    ): Promise<any[]> {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const isHistorical = finishDate < now;
        const cacheKey = `powerDataHourly:${startDate.toISOString()}:${finishDate.toISOString()}`;
        if (isHistorical) {
            const cached = await this.cacheManager.get<any[]>(cacheKey);
            if (cached) {
                return cached;
            }
        }
        const records = await this.powerDataRepository
            .createQueryBuilder('record')
            .where('record.created >= :startDate and record.created <= :finishDate', {
                startDate,
                finishDate,
            })
            .orderBy('record.created', 'ASC')
            .addOrderBy('record.hours', 'ASC')
            .getMany();
        const result = records.map((record) => ({
            created: record.created,
            hours: record.hours,
            power: Math.round((record.power / 1000) * 100) / 100,
        }));
        if (isHistorical) {
            await this.cacheManager.set(cacheKey, result, Constants.CacheOneDay);
        }
        return result;
    }

    @LogMethod()
    async getPowerDataDaily(
        startDate: Date,
        finishDate: Date,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options?: { suppressLogging?: boolean },
    ): Promise<any[]> {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const isHistorical = finishDate < now;
        const cacheKey = `powerDataDaily:${startDate.toISOString()}:${finishDate.toISOString()}`;
        if (isHistorical) {
            const cached = await this.cacheManager.get<any[]>(cacheKey);
            if (cached) {
                return cached;
            }
        }
        const records = await this.powerDataRepository
            .createQueryBuilder('record')
            .select('record.created, SUM(record.power) as power')
            .groupBy('record.created')
            .where('record.created >= :startDate and record.created <= :finishDate', {
                startDate,
                finishDate,
            })
            .orderBy('record.created', 'ASC')
            .getRawMany();
        const result = records.map((record) => ({
            created: record['created'],
            power: Math.round((record['power'] / 1000) * 100) / 100,
        }));
        if (isHistorical) {
            await this.cacheManager.set(cacheKey, result, Constants.CacheOneDay);
        }
        return result;
    }

    async getPowerDataMonthly(startDate: Date, finishDate: Date): Promise<any[]> {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const isHistorical = finishDate < now;
        const cacheKey = `powerDataMonthly:${startDate.toISOString()}:${finishDate.toISOString()}`;
        if (isHistorical) {
            const cached = await this.cacheManager.get<any[]>(cacheKey);
            if (cached) {
                return cached;
            }
        }
        const records = await this.powerDataRepository
            .createQueryBuilder('record')
            .select(
                'EXTRACT(month from record.created) as month, EXTRACT(year from record.created) as year',
            )
            .addSelect('SUM(record.power) as power')
            .groupBy('EXTRACT(month from record.created), EXTRACT(year from record.created)')
            .where('record.created >= :startDate and record.created <= :finishDate')
            .orderBy('EXTRACT(month from record.created), EXTRACT(year from record.created)', 'ASC')
            .setParameters({ startDate, finishDate })
            .getRawMany();

        const data = records.map((record) => ({
            year: record['year'],
            month: record['month'],
            power: Math.round((record['power'] / 1000) * 100) / 100,
        }));
        if (isHistorical) {
            await this.cacheManager.set(cacheKey, data, Constants.CacheOneDay);
        }
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

        const data = records.map((record) => {
            return {
                year: record['year'],
                month: record['month'],
                power: Math.round((record['power'] / 1000) * 100) / 100,
            };
        });
        return data;
    }

    async getPowerAvailabilityData(startDate: Date, finishDate: Date): Promise<any[]> {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const isHistorical = finishDate < now;
        const cacheKey = `powerAvailabilityData:${startDate.toISOString()}:${finishDate.toISOString()}`;
        if (isHistorical) {
            const cached = await this.cacheManager.get<any[]>(cacheKey);
            if (cached) {
                return cached;
            }
        }
        const startRequestDate = new Date(startDate);
        startRequestDate.setDate(startRequestDate.getDate() - 1);
        const finishRequestDate = new Date(finishDate);
        finishRequestDate.setDate(finishRequestDate.getDate() + 1);
        let records = await this.powerAvailabilityRepository
            .createQueryBuilder('record')
            .where('record.created >= :startDate and record.created <= :finishDate')
            .orderBy('record.created', 'ASC')
            .setParameters({ startDate: startRequestDate, finishDate: finishRequestDate })
            .getMany();

        let startRecords = records.map((record) => {
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

        const finishRecords = records.map((record) => {
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
                let finishDateInt = startRecords[i].eventDate.getTime() - Constants.RebootDuration;
                if (finishDateInt < startRecords[i - 1].eventDate.getTime()) {
                    finishDateInt = startRecords[i - 1].eventDate.getTime();
                }
                const startDateInt = startRecords[i - 1].eventDate.getTime();
                data.push({
                    start: startRecords[i - 1].eventDate,
                    finish: new Date(finishDateInt),
                    month: new Date(startDateInt).getMonth() + 1,
                    year: new Date(startDateInt).getFullYear(),
                    day: new Date(startDateInt).getDate(),
                    duration: finishDateInt - startDateInt,
                });
            }
            let result = [];
            for (const item of data) {
                const start =
                    item.start.getFullYear() * 365 +
                    item.start.getMonth() * 30 +
                    item.start.getDate();
                const finish =
                    item.finish.getFullYear() * 365 +
                    item.finish.getMonth() * 30 +
                    item.finish.getDate();
                if (start === finish) {
                    result.push(item);
                } else {
                    const todayItem = { ...item };
                    const finishDate = new Date(
                        item.start.getFullYear(),
                        item.start.getMonth(),
                        item.start.getDate(),
                        23,
                        59,
                        59,
                        999,
                    );
                    todayItem.finish = finishDate;
                    todayItem.duration = finishDate.getTime() - item.start.getTime();
                    result.push(todayItem);
                    const startDate = new Date(
                        item.finish.getFullYear(),
                        item.finish.getMonth(),
                        item.finish.getDate(),
                        0,
                        0,
                        0,
                        0,
                    );
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
            result = result.filter(
                (e) =>
                    new Date(e.year, e.month - 1, e.day) >= startDate &&
                    new Date(e.year, e.month - 1, e.day) <= finishDate,
            );
            const finalData = result;
            if (isHistorical) {
                await this.cacheManager.set(cacheKey, finalData, Constants.CacheOneDay);
            }
            return finalData;
        } else {
            const finalData: any[] = [];
            if (isHistorical) {
                await this.cacheManager.set(cacheKey, finalData, Constants.CacheOneDay);
            }
            return finalData;
        }
    }

    async getPowerAvailabilityDailyData(startDate: Date, finishDate: Date): Promise<any[]> {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const isHistorical = finishDate < now;
        const cacheKeyDaily = `powerAvailabilityDaily:${startDate.toISOString()}:${finishDate.toISOString()}`;
        if (isHistorical) {
            const cached = await this.cacheManager.get<any[]>(cacheKeyDaily);
            if (cached) {
                return cached;
            }
        }
        const data = (await this.getPowerAvailabilityData(startDate, finishDate)).reduce((a, b) => {
            let current = a.find(
                (e) => e.year * 365 + e.month * 30 + e.day === b.year * 365 + b.month * 30 + b.day,
            );
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

        if (isHistorical) {
            await this.cacheManager.set(cacheKeyDaily, data, Constants.CacheOneDay);
        }
        return data;
    }

    async getPowerAvailabilityMonthlyData(startDate: Date, finishDate: Date): Promise<any[]> {
        const nowMon = new Date();
        nowMon.setHours(0, 0, 0, 0);
        const isHistorical = finishDate < nowMon;
        const cacheKeyMon = `powerAvailabilityMonthly:${startDate.toISOString()}:${finishDate.toISOString()}`;
        if (isHistorical) {
            const cached = await this.cacheManager.get<any[]>(cacheKeyMon);
            if (cached) {
                return cached;
            }
        }
        const data = (await this.getPowerAvailabilityData(startDate, finishDate)).reduce((a, b) => {
            let current = a.find((e) => e.month === b.month && e.year === b.year);
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

        if (isHistorical) {
            await this.cacheManager.set(cacheKeyMon, data, Constants.CacheOneDay);
        }
        return data;
    }

    async getPowerAvailabilityYearlyData(startDate: Date, finishDate: Date): Promise<any[]> {
        const data = (await this.getPowerAvailabilityData(startDate, finishDate)).reduce((a, b) => {
            let current = a.find((e) => e.year === b.year);
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
        const nowVA = new Date();
        nowVA.setHours(0, 0, 0, 0);
        const isHistoricalVA = finishDate < nowVA;
        const cacheKeyVA = `voltageAmperage:${startDate.toISOString()}:${finishDate.toISOString()}`;
        if (isHistoricalVA) {
            const cached = await this.cacheManager.get<any[]>(cacheKeyVA);
            if (cached) {
                return cached;
            }
        }
        const records = await this.voltageAmperageRepository
            .createQueryBuilder('record')
            .where('record.created >= :startDate and record.created <= :finishDate')
            .orderBy('record.created, record.hours', 'ASC')
            .setParameters({ startDate, finishDate })
            .getMany();

        const data = records.map((record) => ({
            created: record.created,
            hours: record.hours,
            amperageMin: record.amperageMin,
            amperageMax: record.amperageMax,
            amperageAvg: Math.round((record.amperageSum / record.samples) * 100) / 100,
            voltageMin: record.voltageMin,
            voltageMax: record.voltageMax,
            voltageAvg: Math.round((record.voltageSum / record.samples) * 100) / 100,
        }));
        if (isHistoricalVA) {
            await this.cacheManager.set(cacheKeyVA, data, Constants.CacheOneDay);
        }
        return data;
    }

    async getVoltageData(startDate: Date, finishDate: Date): Promise<any[]> {
        const records = await this.voltageRepository
            .createQueryBuilder('record')
            .where('record.created >= :startDate and record.created <= :finishDate')
            .orderBy('record.created', 'ASC')
            .setParameters({ startDate, finishDate })
            .getMany();

        const data = records.map((record) => {
            return {
                created: record.created,
                voltage: record.voltage,
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
