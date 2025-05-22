import { expect } from 'chai';
import * as sinon from 'sinon';
import { CollectDataService } from '../../src/modules/collect-data/collect-data.service';
import type { Logger } from 'winston';
import { ConfigService } from '../../src/modules/config/config.service';
import { DataService } from '../../src/modules/collect-data/data.service';
import { TelegramService } from '../../src/modules/messages/telegram.service';
import { SerialPortService } from '../../src/modules/collect-data/serial-port.service';
import { BoardCoefficientsModel } from '../../src/common/models/dto/board-coefficients.model';

describe('CollectDataService', () => {
    let service: CollectDataService;
    let loggerStub: sinon.SinonStubbedInstance<Logger>;
    let configStub: sinon.SinonStubbedInstance<ConfigService>;
    let dataServiceStub: sinon.SinonStubbedInstance<DataService>;
    let telegramStub: sinon.SinonStubbedInstance<TelegramService>;
    let serialPortStub: sinon.SinonStubbedInstance<SerialPortService>;

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
            voltageCalibration: 1,
            currentCalibration: 2,
            powerFactorCalibration: 3,
            powerCoefficient: 4,
            isDevEnvironment: false,
        } as any;
        dataServiceStub = {
            processVoltageData: sinon.stub().resolves(),
            processVoltageAmperageData: sinon.stub().resolves(),
            processPowerData: sinon.stub().resolves(),
            processBoardVersionData: sinon.stub().resolves(),
            processCalibrationCoefficientsData: sinon.stub().resolves(),
        } as any;
        telegramStub = {
            sendTelegramMessage: sinon.stub().resolves(),
        } as any;
        serialPortStub = {
            initSerial: sinon.stub(),
            close: sinon.stub(),
            write: sinon.stub(),
        } as any;

        service = new CollectDataService(
            loggerStub,
            configStub as unknown as ConfigService,
            dataServiceStub as unknown as DataService,
            telegramStub as unknown as TelegramService,
            serialPortStub as unknown as SerialPortService,
        );
    });

    it('start should call initSerial with correct parameters', () => {
        service.start();
        expect(serialPortStub.initSerial.calledOnce).to.be.true;
        const args = serialPortStub.initSerial.getCall(0).args;
        expect(args[0]).to.equal(configStub.serialPortName);
        expect(args[1]).to.equal(configStub.serialPortSpeed);
        expect(typeof args[2]).to.equal('function');
    });

    it('stop should call close', () => {
        service.stop();
        expect(serialPortStub.close.calledOnce).to.be.true;
    });

    it('requestBuildDate and requestCoefficients should write correct commands', () => {
        service.requestBuildDate();
        expect(serialPortStub.write.calledWith('d\n')).to.be.true;
        service.requestCoefficients();
        expect(serialPortStub.write.calledWith('i\n')).to.be.true;
    });

    it('setBoardCoefficients should log and write formatted string', () => {
        const coeff = new BoardCoefficientsModel();
        coeff.voltageCalibration = 10;
        coeff.currentCalibration = 20;
        coeff.powerFactorCalibration = 30;
        service.setBoardCoefficients(coeff);
        expect(loggerStub.debug.calledOnce).to.be.true;
        const msg = serialPortStub.write.getCall(0).args[0] as string;
        expect(msg).to.equal('s10:20:30\n');
    });

    it('checkSerialAvailability should handle unavailable data and send telegram', async () => {
        // Simulate last event too old
        (service as any).lastDataReceiveEvent = new Date(Date.now() - 30000);
        await service.checkSerialAvailability();
        expect(loggerStub.error.calledOnce).to.be.true;
        expect(telegramStub.sendTelegramMessage.calledOnce).to.be.true;
    });

    describe('serialReceiveData', () => {
        it('should parse data type and process sensor data', async () => {
            const received: any[] = [];
            service.getSensorsData.subscribe((data) => received.push(data));
            const payload = { type: 'data', voltage: 10, current: 2, power: 5, powerFactor: 1 };
            const msg = JSON.stringify(payload) + '\r';
            await (service as any).serialReceiveData(msg);
            // subject should emit a SensorsData instance
            expect(received).to.have.length(1);
            const sd = received[0];
            expect(sd).to.have.property('voltage', 10);
            expect(sd).to.have.property('amperage', 2);
            // dataService methods called
            expect(dataServiceStub.processVoltageAmperageData.calledOnceWith(sd)).to.be.true;
            expect(dataServiceStub.processVoltageData.calledOnceWith(sd)).to.be.true;
            expect(dataServiceStub.processPowerData.calledOnceWith(sd)).to.be.true;
        });

        it('should parse coefficients and publish to calibrationCoefficients', async () => {
            const received: any[] = [];
            service.calibrationCoefficients.subscribe((c) => received.push(c));
            const payload = { type: 'coefficients', voltage: 1, current: 2, powerFactor: 3 };
            const msg = JSON.stringify(payload) + '\r';
            await (service as any).serialReceiveData(msg);
            // dataService stub called with BoardCoefficientsModel
            expect(dataServiceStub.processCalibrationCoefficientsData.callCount).to.equal(1);
            const coeffArg = dataServiceStub.processCalibrationCoefficientsData.getCall(0).args[0];
            expect(coeffArg).to.be.instanceOf(BoardCoefficientsModel);
            expect(coeffArg).to.have.property('voltageCalibration', 1);
            expect(coeffArg).to.have.property('currentCalibration', 2);
            expect(coeffArg).to.have.property('powerFactorCalibration', 3);
            // subject should emit a BoardCoefficientsModel instance with matching fields
            expect(received).to.have.length(1);
            expect(received[0]).to.have.property('voltageCalibration', 1);
            expect(received[0]).to.have.property('currentCalibration', 2);
            expect(received[0]).to.have.property('powerFactorCalibration', 3);
        });

        it('should parse info and publish to sketchBuildDate', async () => {
            const received: any[] = [];
            service.sketchBuildDate.subscribe((v) => received.push(v));
            const dateStr = '2025-05-22T10:00:00Z';
            const payload = { type: 'info', version: 'v1', date: dateStr };
            const msg = JSON.stringify(payload) + '\r';
            await (service as any).serialReceiveData(msg);
            // dataService stub called with VersionModel
            expect(dataServiceStub.processBoardVersionData.callCount).to.equal(1);
            const versionArg = dataServiceStub.processBoardVersionData.getCall(0).args[0];
            // VersionModel instance should have correct fields
            expect(versionArg).to.have.property('version', 'v1');
            // Compare ISO string without milliseconds to match expected dateStr
            expect(versionArg.buildDate.toISOString().split('.')[0] + 'Z').to.equal(dateStr);
            // subject should emit VersionModel instance
            expect(received).to.have.length(1);
            expect(received[0]).to.have.property('version', 'v1');
            // Compare emitted ISO string without milliseconds to match expected dateStr
            expect(received[0].buildDate.toISOString().split('.')[0] + 'Z').to.equal(dateStr);
        });

        it('should ignore non-JSON messages', async () => {
            const received: any[] = [];
            service.getSensorsData.subscribe((data) => received.push(data));
            await (service as any).serialReceiveData('random text');
            expect(received).to.be.empty;
        });
    });

    describe('checkSerialAvailability edge cases', () => {
        it('should not send telegram if already unavailable', async () => {
            // mark as unavailable
            (service as any).serialDataIsAvailable = false;
            (service as any).lastDataReceiveEvent = new Date(Date.now() - 60000);
            await service.checkSerialAvailability();
            expect(loggerStub.error.notCalled).to.be.true;
            expect(telegramStub.sendTelegramMessage.notCalled).to.be.true;
        });
        it('should not send telegram if recent data received', async () => {
            // fresh event
            (service as any).lastDataReceiveEvent = new Date(Date.now());
            await service.checkSerialAvailability();
            expect(loggerStub.error.notCalled).to.be.true;
            expect(telegramStub.sendTelegramMessage.notCalled).to.be.true;
        });
    });

    describe('getFakePowerData', () => {
        let randomStub: sinon.SinonStub;
        beforeEach(() => {
            // control randomness to predictable values
            randomStub = sinon.stub(Math, 'random');
        });
        afterEach(() => {
            randomStub.restore();
        });
        it('should return SensorsData with correct computed power', () => {
            // random sequence: first for amperage, second for voltage
            randomStub.onFirstCall().returns(0.5); // amperage randomInt 0-100 => 50/10 = 5
            randomStub.onSecondCall().returns(0.5); // voltage randomInt 2000-2500 => mid ~2250/10 = 225
            // setup config coefficient
            (service as any).config.powerCoefficient = 2;
            const sd: any = (service as any).getFakePowerData();
            // expected amperage and voltage
            expect(sd).to.have.property('amperage', 5);
            expect(sd).to.have.property('voltage', 225);
            // expected power calculation: (voltage*amperage*coef)/(60*60)
            const expectedPower = (225 * 5 * 2) / (60 * 60);
            expect(sd).to.have.property('power').that.is.closeTo(expectedPower, 1e-6);
        });
    });
});
