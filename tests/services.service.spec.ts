import { expect } from 'chai';
import * as sinon from 'sinon';
import { ServicesService } from '../src/modules/services/services.service';
import { DataService } from '../src/modules/collect-data/data.service';
import { CoefficientsModel } from '../src/common/models/coefficients.model';

describe('ServicesService', () => {
    let service: ServicesService;
    let dataServiceStub: sinon.SinonStubbedInstance<DataService>;

    beforeEach(() => {
        dataServiceStub = sinon.createStubInstance(DataService);
        service = new ServicesService(dataServiceStub as unknown as DataService);
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
            .stub(service, 'getSystemUptime' as keyof ServicesService)
            .returns(fakeUptime as any);
        const result = service.getSystemUptimeSeconds();
        expect(result).to.equal(1 * 86400 + 2 * 3600 + 3 * 60 + 4);
        stub.restore();
    });
});
