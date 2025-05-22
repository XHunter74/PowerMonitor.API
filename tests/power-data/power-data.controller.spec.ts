import { expect } from 'chai';
import * as sinon from 'sinon';
import { PowerDataController } from '../../src/modules/power-data/power-data.controller';

describe('PowerDataController', () => {
    let controller: PowerDataController;
    let logger: any;
    let service: any;

    beforeEach(() => {
        logger = { info: sinon.stub(), debug: sinon.stub() };
        service = {
            getVoltageAmperage: sinon.stub(),
            getVoltageData: sinon.stub(),
            getPowerDataHourly: sinon.stub(),
            getPowerDataStats: sinon.stub(),
            getPowerDataDaily: sinon.stub(),
            getPowerDataMonthly: sinon.stub(),
            getPowerDataYearly: sinon.stub(),
            getPowerAvailabilityData: sinon.stub(),
            getPowerAvailabilityDailyData: sinon.stub(),
            getPowerAvailabilityMonthlyData: sinon.stub(),
            getPowerAvailabilityYearlyData: sinon.stub(),
        };
        controller = new PowerDataController(logger, service);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('getVoltageAmperage returns data and logs', async () => {
        service.getVoltageAmperage.resolves([1, 2]);
        const result = await controller.getVoltageAmperage({
            startDate: '2025-05-01',
            finishDate: '2025-05-02',
        });
        expect(result).to.deep.equal([1, 2]);
        expect(logger.info.called).to.be.true;
        expect(service.getVoltageAmperage.calledOnce).to.be.true;
    });

    it('getVoltageData returns data and logs', async () => {
        service.getVoltageData.resolves([3, 4]);
        const result = await controller.getVoltageData({
            startDate: '2025-05-01',
            finishDate: '2025-05-02',
        });
        expect(result).to.deep.equal([3, 4]);
        expect(logger.info.called).to.be.true;
        expect(service.getVoltageData.calledOnce).to.be.true;
    });

    it('getPowerDataHourly returns data and logs', async () => {
        service.getPowerDataHourly.resolves([5]);
        const result = await controller.getPowerDataHourly({
            startDate: '2025-05-01',
            finishDate: '2025-05-02',
        });
        expect(result).to.deep.equal([5]);
        expect(logger.info.called).to.be.true;
        expect(service.getPowerDataHourly.calledOnce).to.be.true;
    });

    it('getPowerDataStats returns data and logs', async () => {
        service.getPowerDataStats.resolves([6]);
        const result = await controller.getPowerDataStats({ month: 5, dayOfWeek: 2 });
        expect(result).to.deep.equal([6]);
        expect(logger.info.called).to.be.true;
        expect(service.getPowerDataStats.calledOnce).to.be.true;
    });

    it('getPowerDataDaily returns data and logs', async () => {
        service.getPowerDataDaily.resolves([7]);
        const result = await controller.getPowerDataDaily({
            startDate: '2025-05-01',
            finishDate: '2025-05-02',
        });
        expect(result).to.deep.equal([7]);
        expect(logger.info.called).to.be.true;
        expect(service.getPowerDataDaily.calledOnce).to.be.true;
    });

    it('getPowerDataMonthly returns data and logs', async () => {
        service.getPowerDataMonthly.resolves([8]);
        const result = await controller.getPowerDataMonthly({
            startDate: '2025-05-01',
            finishDate: '2025-05-31',
        });
        expect(result).to.deep.equal([8]);
        expect(logger.info.called).to.be.true;
        expect(service.getPowerDataMonthly.calledOnce).to.be.true;
    });

    it('getPowerDataYearly returns data and logs', async () => {
        service.getPowerDataYearly.resolves([9]);
        const result = await controller.getPowerDataYearly();
        expect(result).to.deep.equal([9]);
        expect(logger.info.called).to.be.true;
        expect(service.getPowerDataYearly.calledOnce).to.be.true;
    });

    it('getPowerAvailabilityData returns data and logs', async () => {
        service.getPowerAvailabilityData.resolves([10]);
        const result = await controller.getPowerAvailabilityData({
            startDate: '2025-05-01',
            finishDate: '2025-05-02',
        });
        expect(result).to.deep.equal([10]);
        expect(logger.info.called).to.be.true;
        expect(service.getPowerAvailabilityData.calledOnce).to.be.true;
    });

    it('getPowerAvailabilityDailyData returns data and logs', async () => {
        service.getPowerAvailabilityDailyData.resolves([11]);
        const result = await controller.getPowerAvailabilityDailyData({ year: 2025, month: 5 });
        expect(result).to.deep.equal([11]);
        expect(logger.info.called).to.be.true;
        expect(service.getPowerAvailabilityDailyData.calledOnce).to.be.true;
    });

    it('getPowerAvailabilityMonthlyData returns data and logs', async () => {
        service.getPowerAvailabilityMonthlyData.resolves([12]);
        const result = await controller.getPowerAvailabilityMonthlyData({ year: 2025 });
        expect(result).to.deep.equal([12]);
        expect(logger.info.called).to.be.true;
        expect(service.getPowerAvailabilityMonthlyData.calledOnce).to.be.true;
    });

    it('getPowerAvailabilityYearlyData returns data and logs', async () => {
        service.getPowerAvailabilityYearlyData.resolves([13]);
        const result = await controller.getPowerAvailabilityYearlyData();
        expect(result).to.deep.equal([13]);
        expect(logger.info.called).to.be.true;
        expect(service.getPowerAvailabilityYearlyData.calledOnce).to.be.true;
    });
});
