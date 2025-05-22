import { expect } from 'chai';
import * as sinon from 'sinon';
import { ServicesController } from '../../src/modules/services/services.controller';
import { ServicesService } from '../../src/modules/services/services.service';
import { Logger } from 'winston';

describe('ServicesController', () => {
    let controller: ServicesController;
    let serviceStub: sinon.SinonStubbedInstance<ServicesService>;
    let loggerStub: sinon.SinonStubbedInstance<Logger>;

    beforeEach(() => {
        serviceStub = sinon.createStubInstance(ServicesService);
        loggerStub = {
            info: sinon.stub(),
            debug: sinon.stub(),
            error: sinon.stub(),
            warn: sinon.stub(),
        } as any;
        controller = new ServicesController(loggerStub as any, serviceStub as any);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return system info from service', async () => {
        const fakeSysInfo = {
            version: '1.0.0',
            manufacturer: 'TestManufacturer',
            model: 'TestModel',
            platform: 'TestPlatform',
            arch: 'x64',
            release: '1.0.0',
            hostname: 'test-host',
            uptime: 12345,
            totalmem: 4096,
            freemem: 2048,
            cpus: [
                {
                    model: 'TestCPU',
                    speed: 2400,
                    times: { user: 1, nice: 2, sys: 3, idle: 4, irq: 5 },
                },
            ],
            distro: 'TestDistro',
            cpuManufacturer: 'TestCPUManufacturer',
            cpuBrand: 'TestCPUBrand',
            cpuSpeed: 2400,
            cpuCores: 4,
            cpuPhysicalCores: 2,
            serial: 'TestSerial',
            systemUptime: { days: 1, hours: 2, minutes: 3, seconds: 4 },
            systemDateTimeStr: '2025-05-22T12:34:56Z',
        };
        serviceStub.getSystemInfo.resolves(fakeSysInfo);
        const result = await controller.getSysInfo();
        expect(result).to.equal(fakeSysInfo);
        expect(serviceStub.getSystemInfo.calledOnce).to.be.true;
    });

    it('should return sketch build date from service', async () => {
        const fakeBuildDate = { build: '2025-05-22' };
        serviceStub.getSketchBuildDate.resolves(fakeBuildDate);
        const result = await controller.getSketchBuildDate();
        expect(result).to.equal(fakeBuildDate);
        expect(serviceStub.getSketchBuildDate.calledOnce).to.be.true;
    });

    it('should return calibration coefficients from service', async () => {
        const fakeCoefficients = { currentCalibration: 1, voltageCalibration: 2 };
        serviceStub.getCalibrationCoefficients.resolves(fakeCoefficients);
        const result = await controller.getCalibrationCoefficients();
        expect(result).to.equal(fakeCoefficients);
        expect(serviceStub.getCalibrationCoefficients.calledOnce).to.be.true;
    });

    it('should return pong for ping', () => {
        const result = controller.ping();
        expect(result).to.deep.equal({ response: 'pong' });
    });
});
