import { expect } from 'chai';
import * as sinon from 'sinon';
// Stub constructors for SerialPort and ReadlineParser
const SerialPortStub = sinon.stub();
const ReadlineParserStub = sinon.stub();
// Use proxyquire to inject stubs
const proxyquire = require('proxyquire').noCallThru();
const { SerialPortService } = proxyquire('../../src/modules/collect-data/serial-port.service', {
    serialport: { SerialPort: SerialPortStub, ReadlineParser: ReadlineParserStub },
});
import type { Logger } from 'winston';

describe('SerialPortService', () => {
    let service: InstanceType<typeof SerialPortService>;
    let loggerStub: sinon.SinonStubbedInstance<Logger>;
    let serialInstance: any;
    let parserInstance: any;
    const path = 'COM1';
    const baudRate = 9600;
    const onData = sinon.stub();

    beforeEach(() => {
        // Reset sinon state and stub histories
        // Reset stub histories
        SerialPortStub.resetHistory();
        ReadlineParserStub.resetHistory();
        loggerStub = {
            // Use a generic stub signature to accept any arguments
            info: sinon.stub() as sinon.SinonStub<any[], any>,
            error: sinon.stub() as sinon.SinonStub<any[], any>,
        } as any;
        // Configure stubs to simulate implementations
        SerialPortStub.resetHistory();
        ReadlineParserStub.resetHistory();
        SerialPortStub.callsFake((options: any) => {
            const handlers: Record<string, Function> = {};
            const pipeStub = sinon.stub();
            const onStub = sinon.stub().callsFake((event: string, cb: Function) => {
                handlers[event] = cb;
            });
            return {
                isOpen: true,
                handlers,
                pipe: pipeStub,
                on: onStub,
                write: sinon.stub(),
                close: sinon.stub(),
            };
        });
        ReadlineParserStub.callsFake(() => ({ on: sinon.stub() }));
        // Instantiate service and initialize serial port
        service = new SerialPortService(loggerStub);
        service.initSerial(path, baudRate, onData);
        // Grab instances created by stubs
        serialInstance = SerialPortStub.firstCall.returnValue;
        parserInstance = ReadlineParserStub.firstCall.returnValue;
    });

    it('should instantiate SerialPort with correct options and wire parser', () => {
        expect(serialInstance.pipe.calledOnceWith(parserInstance)).to.be.true;
        expect(parserInstance.on.calledOnceWith('data', onData)).to.be.true;
    });

    it('should register open, close, and error handlers', () => {
        // Check event registrations
        const onCalls = serialInstance.on.getCalls();
        const events = onCalls.map((c) => c.args[0]);
        expect(events).to.include.members(['open', 'close', 'error']);
    });

    it('should log on open event', () => {
        // find open callback
        const openCall = serialInstance.on.getCalls().find((c) => c.args[0] === 'open');
        const callback = openCall.args[1];
        callback();
        // The logger should be called once with the expected message
        expect(loggerStub.info.callCount).to.equal(1);
        expect(loggerStub.info.getCall(0).args[0]).to.equal(
            `Serial port '${path}' opened at ${baudRate} b/s.`,
        );
    });

    it('should log on close event', () => {
        const closeCall = serialInstance.on.getCalls().find((c) => c.args[0] === 'close');
        const callback = closeCall.args[1];
        callback();
        expect(loggerStub.info.callCount).to.equal(1);
        expect(loggerStub.info.getCall(0).args[0]).to.equal(`Serial port '${path}' closed.`);
    });

    it('should log on error event', () => {
        const err = new Error('fail');
        const errorCall = serialInstance.on.getCalls().find((c) => c.args[0] === 'error');
        const callback = errorCall.args[1];
        callback(err);
        expect(loggerStub.error.callCount).to.equal(1);
        expect(loggerStub.error.getCall(0).args[0]).to.equal(`Serial port error: ${err}`);
    });

    it('write should write when open', () => {
        const writeStub = sinon.stub();
        serialInstance.write = writeStub;
        serialInstance.isOpen = true;
        service.write('data');
        expect(writeStub.calledOnceWith('data')).to.be.true;
    });

    it('write should not write when closed', () => {
        const writeStub = sinon.stub();
        serialInstance.write = writeStub;
        serialInstance.isOpen = false;
        service.write('data');
        expect(writeStub.notCalled).to.be.true;
    });

    it('close should close when open', () => {
        const closeStub = sinon.stub();
        serialInstance.close = closeStub;
        serialInstance.isOpen = true;
        service.close();
        expect(closeStub.calledOnce).to.be.true;
    });

    it('close should not close when already closed', () => {
        const closeStub = sinon.stub();
        serialInstance.close = closeStub;
        serialInstance.isOpen = false;
        service.close();
        expect(closeStub.notCalled).to.be.true;
    });

    it('isOpen should return serialPort.isOpen', () => {
        serialInstance.isOpen = true;
        expect(service.isOpen()).to.be.true;
        serialInstance.isOpen = false;
        expect(service.isOpen()).to.be.false;
    });
});
