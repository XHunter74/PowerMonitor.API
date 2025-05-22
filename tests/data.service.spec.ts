import { expect } from 'chai';
import * as sinon from 'sinon';
import { DataService } from '../src/modules/collect-data/data.service';
import { VoltageData } from '../src/entities/voltage-data.entity';
import { VoltageAmperageData } from '../src/entities/voltage-amperage-data.entity';
import { PowerData } from '../src/entities/power-data.entity';
import { PowerAcc } from '../src/entities/power-acc.entity';
import { ServerData } from '../src/entities/server-data.entity';
import { Constants } from '../src/constants';
import { SensorsData } from '../src/common/models/sensors-data';
import { CoefficientsModel } from '../src/common/models/coefficients.model';
import { VersionModel } from '../src/common/models/version.model';

describe('DataService', () => {
    let dataService: DataService;
    let serverDataRepo: any;
    let voltageRepo: any;
    let voltageAmpRepo: any;
    let powerDataRepo: any;
    let powerAccRepo: any;
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
        clock = sinon.useFakeTimers(new Date('2025-05-22T12:00:00Z').getTime());

        serverDataRepo = {
            findOne: sinon.stub(),
            save: sinon.stub(),
        };
        voltageRepo = { save: sinon.stub() };
        voltageAmpRepo = { findOne: sinon.stub(), save: sinon.stub() };
        powerDataRepo = { findOne: sinon.stub(), save: sinon.stub() };
        powerAccRepo = { findOne: sinon.stub(), save: sinon.stub() };

        dataService = new DataService(
            serverDataRepo,
            voltageAmpRepo,
            voltageRepo,
            powerDataRepo,
            powerAccRepo,
        );
    });

    afterEach(() => {
        sinon.restore();
        clock.restore();
    });

    describe('processVoltageData', () => {
        it('should save voltage data when voltage and amperage present', async () => {
            const input: SensorsData = { voltage: 120, amperage: 5 } as any;
            await dataService.processVoltageData(input);
            expect(voltageRepo.save.calledOnce).to.be.true;
            const saved: VoltageData = voltageRepo.save.firstCall.args[0];
            expect(saved.voltage).to.equal(120);
            expect(saved.created.toISOString()).to.equal('2025-05-22T12:00:00.000Z');
        });

        it('should do nothing if missing voltage or amperage', async () => {
            await dataService.processVoltageData({ voltage: 0, amperage: 5 } as any);
            expect(voltageRepo.save.notCalled).to.be.true;
        });
    });

    describe('processVoltageAmperageData', () => {
        it('should create new record if none exists', async () => {
            const input: SensorsData = { voltage: 10, amperage: 2 } as any;
            voltageAmpRepo.findOne.resolves(null);
            await dataService.processVoltageAmperageData(input);
            expect(voltageAmpRepo.save.calledOnce).to.be.true;
            const rec: VoltageAmperageData = voltageAmpRepo.save.firstCall.args[0];
            expect(rec.voltageSum).to.equal(10);
            expect(rec.amperageSum).to.equal(2);
            expect(rec.samples).to.equal(1);
            expect(rec.voltageMin).to.equal(10);
            expect(rec.voltageMax).to.equal(10);
            expect(rec.amperageMin).to.equal(2);
            expect(rec.amperageMax).to.equal(2);
            expect(rec.updated.toISOString()).to.equal('2025-05-22T12:00:00.000Z');
        });

        it('should update existing record', async () => {
            const existing = new VoltageAmperageData();
            existing.voltageSum = 5;
            existing.amperageSum = 1;
            existing.samples = 1;
            existing.voltageMin = 5;
            existing.voltageMax = 5;
            existing.amperageMin = 1;
            existing.amperageMax = 1;
            voltageAmpRepo.findOne.resolves(existing);
            const input: SensorsData = { voltage: 15, amperage: 3 } as any;
            await dataService.processVoltageAmperageData(input);
            const rec: VoltageAmperageData = voltageAmpRepo.save.firstCall.args[0];
            expect(rec.voltageSum).to.equal(20);
            expect(rec.amperageSum).to.equal(4);
            expect(rec.samples).to.equal(2);
            expect(rec.voltageMin).to.equal(5);
            expect(rec.voltageMax).to.equal(15);
            expect(rec.amperageMin).to.equal(1);
            expect(rec.amperageMax).to.equal(3);
        });
    });

    describe('processPowerData', () => {
        it('should save power data and update powerAcc', async () => {
            const existingPower = new PowerData();
            existingPower.power = 5;
            powerDataRepo.findOne.resolves(existingPower);
            powerAccRepo.findOne.resolves({ powerAcc: 10 } as any);
            const input: SensorsData = { power: 7 } as any;
            await dataService.processPowerData(input);
            expect(powerDataRepo.save.calledOnce).to.be.true;
            expect(powerAccRepo.save.calledOnce).to.be.true;
            const pd: PowerData = powerDataRepo.save.firstCall.args[0];
            expect(pd.power).to.equal(12);
            const pa: any = powerAccRepo.save.firstCall.args[0];
            expect(pa.powerAcc).to.equal(17);
        });

        it('should do nothing if power missing', async () => {
            await dataService.processPowerData({ power: 0 } as any);
            expect(powerDataRepo.save.notCalled).to.be.true;
        });
    });

    describe('processCalibrationCoefficientsData & processBoardVersionData', () => {
        it('should call setServerData for coefficients', async () => {
            const spy = sinon.spy(dataService, 'setServerData');
            const coeff: CoefficientsModel = { a: 1, b: 2 } as any;
            await dataService.processCalibrationCoefficientsData(coeff);
            expect(spy.calledOnceWith(Constants.dataKeys.coefficients, coeff)).to.be.true;
        });

        it('should call setServerData for board version', async () => {
            const spy = sinon.spy(dataService, 'setServerData');
            const version: VersionModel = { version: 'v1' } as any;
            await dataService.processBoardVersionData(version);
            expect(spy.calledOnceWith(Constants.dataKeys.boardVersion, version)).to.be.true;
        });
    });

    describe('getServerData & setServerData', () => {
        it('getServerData returns record', async () => {
            const rec = { key: 'k', data: 'd' };
            serverDataRepo.findOne.resolves(rec);
            const result = await dataService.getServerData('k');
            expect(result).to.equal(rec);
        });

        it('setServerData creates new record', async () => {
            serverDataRepo.findOne.resolves(null);
            await dataService.setServerData('k', { foo: 'bar' });
            expect(serverDataRepo.save.calledOnce).to.be.true;
            const arg: ServerData = serverDataRepo.save.firstCall.args[0];
            expect(arg.key).to.equal('k');
            expect(arg.data).to.equal(JSON.stringify({ foo: 'bar' }));
            expect(arg.updated.toISOString()).to.equal('2025-05-22T12:00:00.000Z');
        });

        it('setServerData updates existing record', async () => {
            const existing = new ServerData();
            existing.key = 'k';
            serverDataRepo.findOne.resolves(existing);
            await dataService.setServerData('k', 123);
            const arg: ServerData = serverDataRepo.save.firstCall.args[0];
            expect(arg.data).to.equal(JSON.stringify(123));
            expect(arg.updated.toISOString()).to.equal('2025-05-22T12:00:00.000Z');
        });
    });
});
