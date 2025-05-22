import { expect } from 'chai';
import * as sinon from 'sinon';
import { PowerDataService } from '../src/modules/power-data/power-data.service';
import { PowerDataStatsModel } from '../src/common/models/power-data-stats.model';

describe('PowerDataService', () => {
    let service: PowerDataService;
    let voltageAmperageRepo: any;
    let voltageRepo: any;
    let powerDataRepo: any;
    let powerAvailabilityRepo: any;

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
        service = new PowerDataService(
            voltageAmperageRepo,
            voltageRepo,
            powerDataRepo,
            powerAvailabilityRepo,
        );
    });

    afterEach(() => {
        sinon.restore();
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

    // Additional tests for getPowerAvailabilityData, getPowerAvailabilityDailyData, getPowerAvailabilityMonthlyData, getPowerAvailabilityYearlyData, getVoltageAmperage, getVoltageData can be added similarly
});
