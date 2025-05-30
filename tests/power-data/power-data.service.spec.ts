import { expect } from 'chai';
import * as sinon from 'sinon';
import { PowerDataService } from '../../src/modules/power-data/power-data.service';
import { PowerDataStatsModel } from '../../src/shared/models/power-data-stats.model';

describe('PowerDataService', () => {
    let service: PowerDataService;
    let voltageAmperageRepo: any;
    let voltageRepo: any;
    let powerDataRepo: any;
    let powerAvailabilityRepo: any;
    let cacheManager: any;

    beforeEach(() => {
        voltageAmperageRepo = {
            createQueryBuilder: sinon.stub(),
            findOne: sinon.stub(),
            save: sinon.stub(),
            getMany: sinon.stub(),
        };
        voltageRepo = { createQueryBuilder: sinon.stub(), getMany: sinon.stub() };
        powerDataRepo = { createQueryBuilder: sinon.stub(), getMany: sinon.stub() };
        powerAvailabilityRepo = { createQueryBuilder: sinon.stub(), getMany: sinon.stub() };
        cacheManager = { get: sinon.stub(), set: sinon.stub() };
        service = new PowerDataService(
            voltageAmperageRepo,
            voltageRepo,
            powerDataRepo,
            powerAvailabilityRepo,
            cacheManager,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('getPowerAvailabilityData returns pairs sorted and filtered', async () => {
        const repoStub = {
            createQueryBuilder: sinon.stub(),
        } as any;
        // first query: start events
        const qbStart = {
            where: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            setParameters: sinon.stub().returnsThis(),
            getMany: sinon.stub().resolves([
                {
                    id: 1,
                    created: new Date('2025-05-22T00:00:00Z'),
                    updated: new Date('2025-05-22T01:00:00Z'),
                },
            ]),
        };
        // second query: finish events
        const qbFinish = {
            where: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            setParameters: sinon.stub().returnsThis(),
            getMany: sinon.stub().resolves([
                {
                    id: 1,
                    created: new Date('2025-05-22T00:00:00Z'),
                    updated: new Date('2025-05-22T01:00:00Z'),
                },
            ]),
        };
        // chain calls
        powerAvailabilityRepo.createQueryBuilder.onFirstCall().returns(qbStart);
        powerAvailabilityRepo.createQueryBuilder.onSecondCall().returns(qbFinish);
        // reuse existing cacheManager stub
        service = new PowerDataService(
            voltageAmperageRepo,
            voltageRepo,
            powerDataRepo,
            powerAvailabilityRepo,
            cacheManager,
        );
        const result = await service.getPowerAvailabilityData(
            new Date('2025-05-22'),
            new Date('2025-05-22'),
        );
        // with only a single start and finish event spanning midnight, result should be empty
        expect(result).to.be.an('array').that.is.empty;
    });

    it('getPowerAvailabilityDailyData aggregates events per day', async () => {
        // stub getPowerAvailabilityData
        const stubData = [
            { year: 2025, month: 5, day: 22, duration: 10, events: 1 },
            { year: 2025, month: 5, day: 22, duration: 15, events: 1 },
            { year: 2025, month: 5, day: 23, duration: 20, events: 1 },
        ];
        sinon.stub(service, 'getPowerAvailabilityData' as any).resolves(stubData as any);
        const daily = await service.getPowerAvailabilityDailyData(
            new Date('2025-05-22'),
            new Date('2025-05-23'),
        );
        expect(daily).to.deep.include.members([
            { year: 2025, month: 5, day: 22, duration: 25, events: 2 },
            { year: 2025, month: 5, day: 23, duration: 20, events: 1 },
        ]);
    });

    it('getPowerAvailabilityMonthlyData aggregates events per month', async () => {
        const stubData = [
            { year: 2025, month: 5, day: 1, duration: 5, events: 1 },
            { year: 2025, month: 5, day: 2, duration: 10, events: 1 },
            { year: 2025, month: 6, day: 1, duration: 20, events: 1 },
        ];
        sinon.stub(service, 'getPowerAvailabilityData' as any).resolves(stubData as any);
        const monthly = await service.getPowerAvailabilityMonthlyData(
            new Date('2025-05-01'),
            new Date('2025-06-30'),
        );
        expect(monthly).to.deep.include.members([
            { year: 2025, month: 5, duration: 15, events: 2 },
            { year: 2025, month: 6, duration: 20, events: 1 },
        ]);
    });

    it('getPowerAvailabilityYearlyData aggregates events per year', async () => {
        const stubData = [
            { year: 2024, month: 12, day: 31, duration: 30, events: 1 },
            { year: 2025, month: 1, day: 1, duration: 40, events: 1 },
            { year: 2025, month: 5, day: 22, duration: 50, events: 1 },
        ];
        sinon.stub(service, 'getPowerAvailabilityData' as any).resolves(stubData as any);
        const yearly = await service.getPowerAvailabilityYearlyData(
            new Date('2024-12-01'),
            new Date('2025-12-31'),
        );
        expect(yearly).to.deep.include.members([
            { year: 2024, duration: 30, events: 1 },
            { year: 2025, duration: 90, events: 2 },
        ]);
    });

    it('getVoltageAmperage returns mapped stats', async () => {
        const qb = {
            where: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            setParameters: sinon.stub().returnsThis(),
            getMany: sinon.stub().resolves([
                {
                    created: new Date('2025-05-22T10:00:00Z'),
                    hours: 10,
                    amperageMin: 1,
                    amperageMax: 3,
                    amperageSum: 10,
                    voltageMin: 100,
                    voltageMax: 110,
                    voltageSum: 440,
                    samples: 2,
                },
            ]),
        };
        voltageAmperageRepo.createQueryBuilder.returns(qb as any);
        const arr = await service.getVoltageAmperage(
            new Date('2025-05-22'),
            new Date('2025-05-22'),
        );
        expect(arr).to.have.length(1);
        expect(arr[0]).to.include({
            hours: 10,
            amperageMin: 1,
            amperageMax: 3,
            amperageAvg: 5,
            voltageMin: 100,
            voltageMax: 110,
            voltageAvg: 220,
        });
    });

    it('getVoltageData returns mapped records', async () => {
        const qb = {
            where: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            setParameters: sinon.stub().returnsThis(),
            getMany: sinon.stub().resolves([{ created: new Date('2025-05-22'), voltage: 230 }]),
        };
        voltageRepo.createQueryBuilder.returns(qb as any);
        const volt = await service.getVoltageData(new Date('2025-05-22'), new Date('2025-05-22'));
        expect(volt).to.deep.equal([{ created: new Date('2025-05-22'), voltage: 230 }]);
    });

    describe('caching behaviour', () => {
        let clock: sinon.SinonFakeTimers;
        before(() => {
            // freeze time to 2025-05-25 to make historical checks deterministic
            clock = sinon.useFakeTimers(new Date('2025-05-25T00:00:00Z').getTime());
        });
        after(() => {
            clock.restore();
        });
        it('getPowerDataHourly returns cached data when available', async () => {
            const start = new Date('2025-05-20');
            const finish = new Date('2025-05-23');
            const key = `powerDataHourly:${start.toISOString()}:${finish.toISOString()}`;
            const dummy = [{ created: start, hours: 1, power: 1 }];
            cacheManager.get.withArgs(key).resolves(dummy);
            const result = await service.getPowerDataHourly(start, finish);
            expect(result).to.deep.equal(dummy);
            sinon.assert.notCalled(powerDataRepo.createQueryBuilder);
        });

        it('getPowerDataDaily returns cached data when available', async () => {
            const start = new Date('2025-05-20');
            const finish = new Date('2025-05-23');
            const key = `powerDataDaily:${start.toISOString()}:${finish.toISOString()}`;
            const dummy = [{ created: start, power: 2 }];
            cacheManager.get.withArgs(key).resolves(dummy);
            const result = await service.getPowerDataDaily(start, finish);
            expect(result).to.deep.equal(dummy);
            sinon.assert.notCalled(powerDataRepo.createQueryBuilder);
        });

        it('getPowerDataMonthly returns cached data when available', async () => {
            // use a historical range (finish before current date May 25, 2025)
            const start = new Date('2025-05-01');
            const finish = new Date('2025-05-24');
            const key = `powerDataMonthly:${start.toISOString()}:${finish.toISOString()}`;
            const dummy = [{ year: 2025, month: 5, power: 5 }];
            cacheManager.get.withArgs(key).resolves(dummy);
            const result = await service.getPowerDataMonthly(start, finish);
            expect(result).to.deep.equal(dummy);
            sinon.assert.notCalled(powerDataRepo.createQueryBuilder);
        });

        it('getPowerAvailabilityData returns cached data when available', async () => {
            const start = new Date('2025-05-20');
            const finish = new Date('2025-05-23');
            const key = `powerAvailabilityData:${start.toISOString()}:${finish.toISOString()}`;
            const dummy = [{ start, finish, duration: 3600 }];
            cacheManager.get.withArgs(key).resolves(dummy);
            const result = await service.getPowerAvailabilityData(start, finish);
            expect(result).to.deep.equal(dummy);
            sinon.assert.notCalled(powerAvailabilityRepo.createQueryBuilder);
        });

        it('getPowerAvailabilityDailyData returns cached data when available', async () => {
            const start = new Date('2025-05-20');
            const finish = new Date('2025-05-23');
            const key = `powerAvailabilityDaily:${start.toISOString()}:${finish.toISOString()}`;
            const dummy = [{ year: 2025, month: 5, day: 20, duration: 3600, events: 1 }];
            cacheManager.get.withArgs(key).resolves(dummy);
            const spy = sinon.spy(service, 'getPowerAvailabilityData');
            const result = await service.getPowerAvailabilityDailyData(start, finish);
            expect(result).to.deep.equal(dummy);
            sinon.assert.notCalled(spy);
            spy.restore();
        });

        it('getPowerAvailabilityMonthlyData returns cached data when available', async () => {
            const start = new Date('2025-05-01');
            const finish = new Date('2025-05-24');
            const key = `powerAvailabilityMonthly:${start.toISOString()}:${finish.toISOString()}`;
            const dummy = [{ year: 2025, month: 5, duration: 7200, events: 2 }];
            cacheManager.get.withArgs(key).resolves(dummy);
            const spy = sinon.spy(service, 'getPowerAvailabilityData');
            const result = await service.getPowerAvailabilityMonthlyData(start, finish);
            expect(result).to.deep.equal(dummy);
            sinon.assert.notCalled(spy);
            spy.restore();
        });

        it('getVoltageAmperage returns cached data when available', async () => {
            const start = new Date('2025-05-20');
            const finish = new Date('2025-05-23');
            const key = `voltageAmperage:${start.toISOString()}:${finish.toISOString()}`;
            const dummy = [{ created: start, hours: 1, voltageAvg: 230, amperageAvg: 10 }];
            cacheManager.get.withArgs(key).resolves(dummy);
            const result = await service.getVoltageAmperage(start, finish);
            expect(result).to.deep.equal(dummy);
            sinon.assert.notCalled(voltageAmperageRepo.createQueryBuilder);
        });
    });

    it('getPowerDataStats returns mapped stats', async () => {
        const qb = {
            select: sinon.stub().returnsThis(),
            where: sinon.stub().returnsThis(),
            andWhere: sinon.stub().returnsThis(),
            groupBy: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            getRawMany: sinon
                .stub()
                .resolves([{ month: 5, day_of_week: 3, hours: 12, power: '2.5' }]),
        };
        powerDataRepo.createQueryBuilder.returns(qb);
        const result = await service.getPowerDataStats(5, 3);
        expect(result).to.have.length(1);
        expect(result[0]).to.be.instanceOf(PowerDataStatsModel);
        expect(result[0]).to.include({ month: 5, day_of_week: 3, hours: 12, power: 2.5 });
    });

    it('getPowerDataHourly returns mapped records', async () => {
        const qb = {
            where: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            addOrderBy: sinon.stub().returnsThis(),
            getMany: sinon
                .stub()
                .resolves([{ created: new Date('2025-05-22'), hours: 10, power: 2000 }]),
        };
        powerDataRepo.createQueryBuilder.returns(qb);
        const result = await service.getPowerDataHourly(
            new Date('2025-05-22'),
            new Date('2025-05-23'),
        );
        expect(result).to.have.length(1);
        expect(result[0]).to.include({ hours: 10, power: 2 });
    });

    it('getPowerDataDaily returns mapped records', async () => {
        const qb = {
            select: sinon.stub().returnsThis(),
            groupBy: sinon.stub().returnsThis(),
            where: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            getRawMany: sinon.stub().resolves([{ created: new Date('2025-05-22'), power: 3000 }]),
        };
        powerDataRepo.createQueryBuilder.returns(qb);
        const result = await service.getPowerDataDaily(
            new Date('2025-05-22'),
            new Date('2025-05-23'),
        );
        expect(result).to.have.length(1);
        expect(result[0].power).to.equal(3);
    });

    it('getPowerDataMonthly returns mapped records', async () => {
        const qb = {
            select: sinon.stub().returnsThis(),
            addSelect: sinon.stub().returnsThis(),
            groupBy: sinon.stub().returnsThis(),
            where: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            setParameters: sinon.stub().returnsThis(),
            getRawMany: sinon.stub().resolves([{ year: 2025, month: 5, power: 6000 }]),
        };
        powerDataRepo.createQueryBuilder.returns(qb);
        const result = await service.getPowerDataMonthly(
            new Date('2025-05-01'),
            new Date('2025-05-31'),
        );
        expect(result).to.have.length(1);
        expect(result[0]).to.include({ year: 2025, month: 5, power: 6 });
    });

    it('getPowerDataYearly returns mapped records', async () => {
        const qb = {
            select: sinon.stub().returnsThis(),
            addSelect: sinon.stub().returnsThis(),
            groupBy: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            getRawMany: sinon.stub().resolves([{ year: 2025, power: 12000 }]),
        };
        powerDataRepo.createQueryBuilder.returns(qb);
        const result = await service.getPowerDataYearly();
        expect(result).to.have.length(1);
        expect(result[0].power).to.equal(12);
    });

    it('getPowerAvailabilityData returns empty if not enough records', async () => {
        powerAvailabilityRepo.createQueryBuilder.returns({
            where: sinon.stub().returnsThis(),
            orderBy: sinon.stub().returnsThis(),
            setParameters: sinon.stub().returnsThis(),
            getMany: sinon.stub().resolves([]),
        });
        const result = await service.getPowerAvailabilityData(
            new Date('2025-05-01'),
            new Date('2025-05-02'),
        );
        expect(result).to.deep.equal([]);
    });
});
