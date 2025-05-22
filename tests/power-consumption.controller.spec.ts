import { expect } from 'chai';
import * as sinon from 'sinon';
import { PowerConsumptionController } from '../src/modules/power-data/power-consumption.controller';
import { FactualDataDto } from '../src/common/models/factual-data.dto';
import { MeterDataDto } from '../src/common/models/meter-data.dto';
import { PowerAcc } from '../src/entities/power-acc.entity';

describe('PowerConsumptionController', () => {
    let controller: PowerConsumptionController;
    let logger: any;
    let service: any;

    beforeEach(() => {
        logger = { info: sinon.stub(), error: sinon.stub() };
        service = {
            getPowerMeterData: sinon.stub(),
            addNewFactualData: sinon.stub(),
            deleteFactualData: sinon.stub(),
        };
        controller = new PowerConsumptionController(logger, service);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('getEnergyMeteringData returns data and logs', async () => {
        const data: MeterDataDto[] = [{ id: 1 } as any];
        service.getPowerMeterData.resolves(data);
        const result = await controller.getEnergyMeteringData();
        expect(result).to.equal(data);
        expect(logger.info.calledTwice).to.be.true;
        expect(service.getPowerMeterData.calledOnce).to.be.true;
    });

    it('addNewFactualData calls service and logs', async () => {
        const factual: FactualDataDto = { value: 42 } as any;
        const created: PowerAcc = { id: 1, startValue: 42 } as any;
        service.addNewFactualData.resolves(created);
        const result = await controller.addNewFactualData(factual);
        expect(result).to.equal(created);
        expect(logger.info.callCount).to.be.greaterThan(1);
        expect(service.addNewFactualData.calledOnceWith(factual)).to.be.true;
    });

    it('deleteFactualData calls service and logs', async () => {
        service.deleteFactualData.resolves();
        const result = await controller.deleteFactualData(5);
        expect(service.deleteFactualData.calledOnceWith(5)).to.be.true;
        expect(logger.info.callCount).to.be.greaterThan(1);
        expect(result).to.include('Deleted record with Id: 5');
    });
});
