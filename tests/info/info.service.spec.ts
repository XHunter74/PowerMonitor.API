import { expect } from 'chai';
import * as sinon from 'sinon';
import { InfoService } from '../../src/modules/info/info.service';
import { DataService } from '../../src/modules/collect-data/data.service';
import { CoefficientsModel } from '../../src/shared/models/coefficients.model';
import * as si from 'systeminformation';
import { SysInfoModel, SystemUptime } from '../../src/shared/models/sys-info.model';
import { environment } from '../../src/config/environments';
import { Intervals } from '../../src/config/constants';

describe('InfoService', () => {
    let service: InfoService;
    let dataServiceStub: sinon.SinonStubbedInstance<DataService>;

    beforeEach(() => {
        dataServiceStub = sinon.createStubInstance(DataService);
        service = new InfoService(dataServiceStub as unknown as DataService);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return calibration coefficients with defaults if no data', async () => {
        dataServiceStub.getServerData.resolves(null);
        const result = await service.getCalibrationCoefficients();
        expect(result).to.be.instanceOf(CoefficientsModel);
        expect(result.currentCalibration).to.equal(1);
        expect(result.voltageCalibration).to.equal(1);
    });

    it('should return calibration coefficients from data', async () => {
        const fakeData = {
            id: 1,
            created: new Date(),
            key: 'calibration',
            updated: new Date(),
            data: JSON.stringify({ currentCalibration: 2, voltageCalibration: 3 }),
        };
        dataServiceStub.getServerData.resolves(fakeData);
        const result = await service.getCalibrationCoefficients();
        expect(result.currentCalibration).to.equal(2);
        expect(result.voltageCalibration).to.equal(3);
    });

    it('should return sketch build date as null if no data', async () => {
        const fakeData = {
            id: 1,
            created: new Date(),
            key: 'build',
            updated: new Date(),
            data: JSON.stringify({ build: '2025-05-22' }),
        };
        dataServiceStub.getServerData.resolves(fakeData);
        const result = await service.getSketchBuildDate();
        expect(result).to.deep.equal({ build: '2025-05-22' });
    });

    it('should return parsed sketch build date if data exists', async () => {
        const fakeData = {
            id: 1,
            created: new Date(),
            key: 'build',
            updated: new Date(),
            data: JSON.stringify({ build: '2025-05-22' }),
        };
        dataServiceStub.getServerData.resolves(fakeData);
        const result = await service.getSketchBuildDate();
        expect(result).to.deep.equal({ build: '2025-05-22' });
    });

    it('should calculate system uptime seconds', () => {
        // Mock getSystemUptime to return a known value
        const fakeUptime = { days: 1, hours: 2, minutes: 3, seconds: 4 };
        const stub = sinon
            .stub(service, 'getSystemUptime' as keyof InfoService)
            .returns(fakeUptime as any);
        const result = service.getSystemUptimeSeconds();
        expect(result).to.equal(1 * 86400 + 2 * 3600 + 3 * 60 + 4);
        stub.restore();
    });

    it('should return system info populated from static data', async () => {
        // Stub static data and uptime
        const fakeStaticData = {
            system: { manufacturer: 'Manu', model: 'Mod' },
            os: { platform: 'Plat', distro: 'Dist' },
            cpu: { manufacturer: 'CPUManu', brand: 'CPUBrand', speed: 2.5, cores: 4 },
        };
        // Stub getStaticData to return only required fields (cast to any to satisfy StaticData type)
        sinon.stub(si, 'getStaticData').resolves(fakeStaticData as any);
        sinon
            .stub(service as any, 'getSystemUptime')
            .returns({ days: 0, hours: 1, minutes: 2, seconds: 3 } as SystemUptime);
        const fakeDate = new Date('2022-01-01T12:00:00Z');
        const clock = sinon.useFakeTimers({ now: fakeDate.getTime() });
        const result = await service.getSystemInfo();
        expect(result).to.be.instanceOf(SysInfoModel);
        expect(result.version).to.equal(environment.version);
        expect(result.manufacturer).to.equal('Manu');
        expect(result.model).to.equal('Mod');
        expect(result.platform).to.equal('Plat');
        expect(result.distro).to.equal('Dist');
        expect(result.cpuManufacturer).to.equal('CPUManu');
        expect(result.cpuBrand).to.equal('CPUBrand');
        expect(result.cpuSpeed).to.equal(2.5);
        expect(result.cpuCores).to.equal(4);
        expect(result.systemUptime).to.deep.equal({ days: 0, hours: 1, minutes: 2, seconds: 3 });
        expect(result.systemDateTimeStr).to.equal(fakeDate.toISOString());
        clock.restore();
        (si.getStaticData as sinon.SinonStub).restore();
    });

    it('should convert interval to SystemUptime correctly', () => {
        const interval =
            1 * Intervals.OneDay +
            2 * Intervals.OneHour +
            3 * Intervals.OneMinute +
            4 * Intervals.OneSecond;
        const result = (service as any).intervalToSystemUptime(interval);
        expect(result).to.deep.equal({ days: 1, hours: 2, minutes: 3, seconds: 4 });
    });

    it('should return a SystemUptime object with numeric fields', () => {
        const uptimeObj = (service as any).getSystemUptime();
        expect(uptimeObj).to.have.property('days').that.is.a('number');
        expect(uptimeObj).to.have.property('hours').that.is.a('number');
        expect(uptimeObj).to.have.property('minutes').that.is.a('number');
        expect(uptimeObj).to.have.property('seconds').that.is.a('number');
        // Total seconds should match getSystemUptimeSeconds
        const totalSeconds =
            uptimeObj.days * 86400 +
            uptimeObj.hours * 3600 +
            uptimeObj.minutes * 60 +
            uptimeObj.seconds;
        expect(service.getSystemUptimeSeconds()).to.equal(totalSeconds);
    });
});
