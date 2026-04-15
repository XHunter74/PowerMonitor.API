import { expect } from 'chai';
import * as sinon from 'sinon';
import { CollectDataService } from '../../src/modules/collect-data/collect-data.service';
import type { Logger } from 'winston';
import { ConfigService } from '../../src/config/config.service';
import { DataService } from '../../src/modules/collect-data/data.service';
import { TelegramService } from '../../src/modules/messages/telegram.service';
import { ModbusService } from '../../src/modules/collect-data/modbus.service';

describe('CollectDataService', () => {
    let service: CollectDataService;
    let loggerStub: sinon.SinonStubbedInstance<Logger>;
    let configStub: sinon.SinonStubbedInstance<ConfigService>;
    let dataServiceStub: sinon.SinonStubbedInstance<DataService>;
    let telegramStub: sinon.SinonStubbedInstance<TelegramService>;
    let modbusStub: sinon.SinonStubbedInstance<ModbusService>;

    beforeEach(() => {
        loggerStub = {
            debug: sinon.stub(),
            error: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
        } as any;
        configStub = {
            serialPortName: 'COM1',
            serialPortSpeed: 9600,
            slaveId: 1,
            powerCoefficient: 4,
            isDevEnvironment: false,
        } as any;
        dataServiceStub = {
            processVoltageData: sinon.stub().resolves(),
            processVoltageAmperageData: sinon.stub().resolves(),
            processPowerData: sinon.stub().resolves(),
            processEnergyMeteringData: sinon.stub().resolves(),
        } as any;
        telegramStub = {
            sendTelegramMessage: sinon.stub().resolves(),
        } as any;
        modbusStub = {
            init: sinon.stub(),
            close: sinon.stub(),
            logStatus: sinon.stub(),
            forceReconnect: sinon.stub(),
        } as any;

        service = new CollectDataService(
            loggerStub,
            configStub as unknown as ConfigService,
            dataServiceStub as unknown as DataService,
            telegramStub as unknown as TelegramService,
            modbusStub as unknown as ModbusService,
        );
    });

    it('start should call init with correct parameters', () => {
        service.start();
        expect(modbusStub.init.calledOnce).to.be.true;
        const args = modbusStub.init.getCall(0).args;
        expect(args[0]).to.equal(configStub.serialPortName);
        expect(args[1]).to.equal(configStub.serialPortSpeed);
        expect(args[2]).to.equal(configStub.slaveId);
        expect(typeof args[3]).to.equal('function');
    });

    it('stop should call close', () => {
        service.stop();
        expect(modbusStub.close.calledOnce).to.be.true;
    });

    it('checkSerialAvailability should handle unavailable data and send telegram', async () => {
        (service as any).lastDataReceiveEvent = new Date(Date.now() - 30000);
        await service.checkSerialAvailability();
        expect(loggerStub.error.calledOnce).to.be.true;
        expect(modbusStub.logStatus.calledOnce).to.be.true;
        expect(modbusStub.forceReconnect.calledOnce).to.be.true;
        expect(telegramStub.sendTelegramMessage.calledOnce).to.be.true;
    });

    describe('modbusDataReceived', () => {
        it('should process valid sensor data and emit on getSensorsData', async () => {
            const received: any[] = [];
            service.getSensorsData.subscribe((data) => received.push(data));
            await (service as any).modbusDataReceived({
                voltage: 220,
                current: 5,
                power: 1100,
                frequency: 50,
                energyMeteringData: 12.3,
            });
            expect(received).to.have.length(1);
            expect(received[0]).to.have.property('voltage', 220);
            expect(received[0]).to.have.property('amperage', 5);
            expect(dataServiceStub.processVoltageAmperageData.calledOnce).to.be.true;
            expect(dataServiceStub.processPowerData.calledOnce).to.be.true;
            expect(dataServiceStub.processEnergyMeteringData.calledOnce).to.be.true;
        });

        it('should update lastDataReceiveEvent and set serialDataIsAvailable=true', async () => {
            (service as any).serialDataIsAvailable = false;
            const before = new Date(Date.now() - 1000);
            await (service as any).modbusDataReceived({
                voltage: 220,
                current: 5,
                power: 1100,
                frequency: 50,
                energyMeteringData: 12.3,
            });
            expect((service as any).serialDataIsAvailable).to.be.true;
            expect((service as any).lastDataReceiveEvent).to.be.greaterThan(before);
        });

        it('should reject data with voltage too high', async () => {
            const received: any[] = [];
            service.getSensorsData.subscribe((data) => received.push(data));
            await (service as any).modbusDataReceived({
                voltage: 999,
                current: 5,
                power: 100,
                frequency: 50,
                energyMeteringData: 12.3,
            });
            expect(received).to.be.empty;
            expect(loggerStub.error.calledOnce).to.be.true;
        });

        it('should reject data with amperage too high', async () => {
            const received: any[] = [];
            service.getSensorsData.subscribe((data) => received.push(data));
            await (service as any).modbusDataReceived({
                voltage: 220,
                current: 999,
                power: 100,
                frequency: 50,
                energyMeteringData: 12.3,
            });
            expect(received).to.be.empty;
            expect(loggerStub.error.calledOnce).to.be.true;
        });

        it('should reject data with inconsistent voltage/current', async () => {
            const received: any[] = [];
            service.getSensorsData.subscribe((data) => received.push(data));
            await (service as any).modbusDataReceived({
                voltage: 0,
                current: 5,
                power: 0,
                frequency: 50,
                energyMeteringData: 12.3,
            });
            expect(received).to.be.empty;
            expect(loggerStub.error.calledOnce).to.be.true;
        });
    });

    describe('checkSerialAvailability edge cases', () => {
        it('should not send telegram if already unavailable', async () => {
            (service as any).serialDataIsAvailable = false;
            (service as any).lastDataReceiveEvent = new Date(Date.now() - 60000);
            await service.checkSerialAvailability();
            expect(loggerStub.error.notCalled).to.be.true;
            expect(telegramStub.sendTelegramMessage.notCalled).to.be.true;
        });
        it('should not send telegram if recent data received', async () => {
            (service as any).lastDataReceiveEvent = new Date(Date.now());
            await service.checkSerialAvailability();
            expect(loggerStub.error.notCalled).to.be.true;
            expect(telegramStub.sendTelegramMessage.notCalled).to.be.true;
        });
    });

    describe('getFakePowerData', () => {
        let randomStub: sinon.SinonStub;
        beforeEach(() => {
            randomStub = sinon.stub(Math, 'random');
        });
        afterEach(() => {
            randomStub.restore();
        });
        it('should return SensorsData with correct amperage and voltage', () => {
            randomStub.onFirstCall().returns(0.5); // amperage randomInt 0-100 => 50/10 = 5
            randomStub.onSecondCall().returns(0.5); // voltage randomInt 2000-2500 => ~2250/10 = 225
            (service as any).config.powerCoefficient = 2;
            const sd: any = (service as any).getFakePowerData();
            expect(sd).to.have.property('amperage', 5);
            expect(sd).to.have.property('voltage', 225);
        });
    });
});
