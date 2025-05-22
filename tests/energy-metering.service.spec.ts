import { expect } from 'chai';
import * as sinon from 'sinon';
import { EnergyMeteringService } from '../src/modules/power-data/energy-metering.service';
import { ConfigService } from '../src/modules/config/config.service';
import { FactualDataDto } from '../src/common/models/dto/factual-data.dto';

describe('EnergyMeteringService', () => {
    let service: EnergyMeteringService;
    let configStub: sinon.SinonStubbedInstance<ConfigService>;
    let repoStub: any;

    beforeEach(() => {
        configStub = { powerCoefficient: 1.5 } as any;
        repoStub = {
            createQueryBuilder: sinon.stub(),
            findOne: sinon.stub(),
            save: sinon.stub(),
            delete: sinon.stub(),
        };
        service = new EnergyMeteringService(configStub as any, repoStub as any);
    });

    it('getPowerMeterData returns empty array if no records', async () => {
        const qb = { orderBy: sinon.stub().returnsThis(), getMany: sinon.stub().resolves([]) };
        repoStub.createQueryBuilder.returns(qb);
        const result = await service.getPowerMeterData();
        expect(result).to.deep.equal([]);
    });

    it('getPowerMeterData returns mapped records', async () => {
        const records = [
            {
                id: 1,
                startValue: 10,
                powerAcc: 2000,
                coefficient: 1.5,
                updated: new Date('2024-01-01'),
            },
            {
                id: 2,
                startValue: 12,
                powerAcc: 0,
                coefficient: 1.5,
                updated: new Date('2024-01-02'),
            },
        ];
        const qb = { orderBy: sinon.stub().returnsThis(), getMany: sinon.stub().resolves(records) };
        repoStub.createQueryBuilder.returns(qb);
        const result = await service.getPowerMeterData();
        expect(result).to.have.length(2);
        // The record with the later date (id:2) comes first
        expect(result[0]).to.include({ id: 2, coefficient: 1.5 });
        expect(result[1]).to.include({ id: 1, coefficient: 1.5 });
        expect(result[0].monitorData).to.be.closeTo(12, 0.1);
        expect(result[1].monitorData).to.be.closeTo(12, 0.1);
        expect(result[1].factualData).to.equal(12);
        expect(result[1].difference).to.be.closeTo(0, 0.1);
    });

    it('getCurrentPowerConsumptionData returns calculated value', async () => {
        repoStub.findOne.resolves({ startValue: 10, powerAcc: 2000 });
        const result = await service.getCurrentPowerConsumptionData();
        expect(result).to.be.closeTo(12, 0.1);
    });

    it('getCurrentPowerConsumptionData returns 0 if no record', async () => {
        repoStub.findOne.resolves(undefined);
        const result = await service.getCurrentPowerConsumptionData();
        expect(result).to.equal(0);
    });

    it('addNewFactualData saves and returns new PowerAcc', async () => {
        const factual = { value: 42 } as FactualDataDto;
        const saved = { id: 1, startValue: 42 };
        repoStub.save.resolves(saved);
        const result = await service.addNewFactualData(factual);
        expect(repoStub.save.calledOnce).to.be.true;
        expect(result).to.equal(saved);
    });

    it('updatePowerCoefficient does nothing if no last record', async () => {
        const qb = { orderBy: sinon.stub().returnsThis(), getOne: sinon.stub().resolves(null) };
        repoStub.createQueryBuilder.returns(qb);
        await service.updatePowerCoefficient();
        expect(repoStub.save.called).to.be.false;
    });

    it('updatePowerCoefficient saves new record if coefficient changed', async () => {
        const last = { startValue: 10, powerAcc: 2000, coefficient: 2 };
        const qb = { orderBy: sinon.stub().returnsThis(), getOne: sinon.stub().resolves(last) };
        repoStub.createQueryBuilder.returns(qb);
        repoStub.save.resolves({});
        configStub = { powerCoefficient: 1.5 } as any;
        service = new EnergyMeteringService(configStub as any, repoStub as any);
        await service.updatePowerCoefficient();
        expect(repoStub.save.calledOnce).to.be.true;
    });

    it('deleteFactualData throws if nothing deleted', async () => {
        repoStub.delete.resolves({ affected: 0 });
        try {
            await service.deleteFactualData(1);
            expect.fail('Should throw');
        } catch (e) {
            expect(e.message).to.include('Record not found');
        }
    });

    it('deleteFactualData does not throw if deleted', async () => {
        repoStub.delete.resolves({ affected: 1 });
        await service.deleteFactualData(1);
        expect(repoStub.delete.calledOnceWith(1)).to.be.true;
    });
});
