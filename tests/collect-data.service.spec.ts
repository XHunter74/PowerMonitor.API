import { expect } from 'chai';
import * as sinon from 'sinon';
import { CollectDataService } from '../src/modules/collect-data/collect-data.service';
import type { Logger } from 'winston';
import { ConfigService } from '../src/modules/config/config.service';
import { DataService } from '../src/modules/collect-data/data.service';
import { TelegramService } from '../src/modules/messages/telegram.service';
import { SerialPortService } from '../src/modules/collect-data/serial-port.service';
import { BoardCoefficientsModel } from '../src/common/models/board-coefficients.model';

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
});
