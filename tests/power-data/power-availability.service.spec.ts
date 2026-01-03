import { expect } from 'chai';
import * as sinon from 'sinon';
import { PowerAvailabilityService } from '../../src/modules/power-data/power-availability.service';
import { PowerAvailability } from '../../src/entities/power-availability.entity';

// Mocks
class LoggerMock {
    info = sinon.stub();
    error = sinon.stub();
    debug = sinon.stub();
}

describe('PowerAvailabilityService', () => {
    let service: PowerAvailabilityService;
    let logger: LoggerMock;
    let repo: any;
    let fsStub: any;

    beforeEach(() => {
        logger = new LoggerMock();
        repo = {
            createQueryBuilder: sinon.stub(),
            findOne: sinon.stub(),
            save: sinon.stub(),
        };
        fsStub = {
            existsSync: sinon.stub(),
            unlinkSync: sinon.stub(),
            writeFile: sinon.stub(),
        };
        // Patch fs methods
        sinon.replace(require('fs'), 'existsSync', fsStub.existsSync);
        sinon.replace(require('fs'), 'unlinkSync', fsStub.unlinkSync);
        sinon.replace(require('fs'), 'writeFile', fsStub.writeFile);
        service = new PowerAvailabilityService(logger as any, repo as any);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('processApplicationStart handles server.off present', async () => {
        fsStub.existsSync.returns(true);
        const maxId = { max: 1 };
        const pa = new PowerAvailability();
        repo.createQueryBuilder.returns({
            select: sinon.stub().returnsThis(),
            getRawOne: sinon.stub().resolves(maxId),
        });
        repo.findOne.resolves(pa);
        repo.save.resolves(pa);
        await service.processApplicationStart();
        expect(fsStub.unlinkSync.calledOnceWith('server.off')).to.be.true;
        expect(repo.save.calledOnce).to.be.true;
        expect(logger.info.called).to.be.true;
    });

    it('processApplicationStart handles server.off absent', async () => {
        fsStub.existsSync.returns(false);
        repo.save.resolves({});
        await service.processApplicationStart();
        expect(logger.error.called).to.be.true;
        expect(repo.save.calledOnce).to.be.true;
    });

    it('updatePowerAvailability creates new if not found', async () => {
        (service as any).isUpdateBlocked = false;
        repo.createQueryBuilder.returns({
            select: sinon.stub().returnsThis(),
            getRawOne: sinon.stub().resolves({ max: 2 }),
        });
        repo.findOne.resolves(undefined);
        repo.save.resolves({});
        await service.updatePowerAvailability();
        expect(repo.save.calledOnce).to.be.true;
    });

    it('updatePowerAvailability updates if found', async () => {
        (service as any).isUpdateBlocked = false;
        repo.createQueryBuilder.returns({
            select: sinon.stub().returnsThis(),
            getRawOne: sinon.stub().resolves({ max: 2 }),
        });
        repo.findOne.resolves(new PowerAvailability());
        repo.save.resolves({});
        await service.updatePowerAvailability();
        expect(repo.save.calledOnce).to.be.true;
    });

    it('processApplicationShutdown writes server.off and logs', () => {
        fsStub.writeFile.yields(null);
        service.processApplicationShutdown('SIGTERM');
        expect(fsStub.writeFile.calledOnceWith('server.off', 'server.off')).to.be.true;
        expect(logger.info.called).to.be.true;
    });

    it('processApplicationShutdown logs error if write fails', () => {
        fsStub.writeFile.yields(new Error('fail'));
        service.processApplicationShutdown('SIGINT');
        expect(logger.debug.called).to.be.true;
    });
});
