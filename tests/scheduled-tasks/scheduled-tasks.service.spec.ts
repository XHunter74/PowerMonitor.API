import { expect } from 'chai';
import * as sinon from 'sinon';
import { ScheduledTasksService } from '../../src/modules/scheduled-tasks/scheduled-tasks.service';

describe('ScheduledTasksService', () => {
    let service: ScheduledTasksService;
    let logger: any;
    let powerAvailabilityService: any;
    let collectDataService: any;
    let servicesService: any;
    let energyMeteringService: any;
    let config: any;
    let mqttService: any;
    let entityManager: any;
    let tokensRepo: any;

    beforeEach(() => {
        logger = { info: sinon.stub(), debug: sinon.stub(), error: sinon.stub() };
        powerAvailabilityService = {
            processApplicationStart: sinon.stub(),
            processApplicationShutdown: sinon.stub(),
            updatePowerAvailability: sinon.stub().resolves(),
        };
        collectDataService = {
            start: sinon.stub(),
            checkSerialAvailability: sinon.stub().resolves(),
            stop: sinon.stub(),
        };
        servicesService = { getSystemInfo: sinon.stub().resolves() };
        energyMeteringService = { updatePowerCoefficient: sinon.stub().resolves() };
        config = { isDevEnvironment: false, refreshTokenLifeTime: 3600 };
        mqttService = {
            publishPowerData: sinon.stub().resolves(),
            processApplicationShutdown: sinon.stub(),
        };
        entityManager = { query: sinon.stub().resolves() };
        // tokensRepo.createQueryBuilder stub
        const qb = { where: sinon.stub().returnsThis(), getMany: sinon.stub().resolves([]) };
        tokensRepo = {
            createQueryBuilder: sinon.stub().returns(qb),
            remove: sinon.stub().resolves(),
        };
        service = new ScheduledTasksService(
            logger,
            powerAvailabilityService,
            collectDataService,
            energyMeteringService,
            servicesService,
            config,
            mqttService,
            entityManager,
            tokensRepo,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('runOnStart', () => {
        it('should call dependencies and log', async () => {
            await service.runOnStart();
            expect(logger.info.calledWithMatch('=> Start')).to.be.true;
            expect(powerAvailabilityService.processApplicationStart.calledOnce).to.be.true;
            expect(collectDataService.start.calledOnce).to.be.true;
            expect(servicesService.getSystemInfo.calledOnce).to.be.true;
            expect(energyMeteringService.updatePowerCoefficient.calledOnce).to.be.true;
            expect(logger.info.calledWithMatch('=> Finish')).to.be.true;
        });

        it('should skip processApplicationStart in dev mode', async () => {
            config.isDevEnvironment = true;
            await service.runOnStart();
            expect(powerAvailabilityService.processApplicationStart.called).to.be.false;
        });
    });

    describe('runPeriodically', () => {
        it('should call update and publish data', async () => {
            await service.runPeriodically();
            expect(powerAvailabilityService.updatePowerAvailability.calledOnce).to.be.true;
            expect(collectDataService.checkSerialAvailability.calledOnce).to.be.true;
            expect(mqttService.publishPowerData.calledOnce).to.be.true;
        });

        it('should catch and log errors', async () => {
            powerAvailabilityService.updatePowerAvailability.rejects(new Error('fail1'));
            collectDataService.checkSerialAvailability.rejects(new Error('fail2'));
            mqttService.publishPowerData.rejects(new Error('fail3'));
            await service.runPeriodically();
            expect(logger.debug.calledThrice).to.be.true;
        });
    });

    describe('runHourly', () => {
        it('should delete outdated data and tokens', async () => {
            // stub private methods
            const delTokens = sinon.stub(service as any, 'deleteOutdatedTokens').resolves();
            const delVoltage = sinon.stub(service as any, 'deleteOutdatedVoltageData').resolves();
            await service.runHourly();
            expect(logger.info.calledWithMatch('=> Start')).to.be.true;
            expect(delTokens.calledOnce).to.be.true;
            expect(delVoltage.calledOnce).to.be.true;
            expect(logger.info.calledWithMatch('=> Finish')).to.be.true;
        });

        it('should log error when deletion fails', async () => {
            sinon.stub(service as any, 'deleteOutdatedTokens').rejects(new Error('bad'));
            sinon.stub(service as any, 'deleteOutdatedVoltageData').rejects(new Error('bad2'));
            await service.runHourly();
            expect(logger.error.called).to.be.true;
        });
    });

    describe('deleteOutdatedVoltageData', () => {
        it('should run delete query', async () => {
            const now = new Date(2025, 4, 22);
            sinon.useFakeTimers(now.getTime());
            await (service as any).deleteOutdatedVoltageData();
            const d = new Date(2025, 3, 22).toISOString().split('T')[0];
            expect(
                entityManager.query.calledWithMatch(
                    `DELETE FROM voltage_data WHERE created < '${d}'`,
                ),
            ).to.be.true;
        });
    });

    describe('deleteOutdatedTokens', () => {
        it('should remove expired tokens', async () => {
            const expired = new Date(Date.now() - config.refreshTokenLifeTime * 1000);
            // simulate one token found
            tokensRepo.createQueryBuilder().getMany.resolves([{ id: 1 }]);
            await (service as any).deleteOutdatedTokens();
            expect(tokensRepo.remove.calledOnce).to.be.true;
        });

        it('should not remove when none', async () => {
            tokensRepo.createQueryBuilder().getMany.resolves([]);
            await (service as any).deleteOutdatedTokens();
            expect(tokensRepo.remove.called).to.be.false;
        });
    });

    describe('onApplicationShutdown', () => {
        it('should call shutdown hooks and stop services', () => {
            service.onApplicationShutdown('SIGTERM');
            expect(logger.info.called).to.be.true;
            expect(powerAvailabilityService.processApplicationShutdown.calledWith('SIGTERM')).to.be
                .true;
            expect(mqttService.processApplicationShutdown.calledWith('SIGTERM')).to.be.true;
            expect(collectDataService.stop.calledOnce).to.be.true;
        });
    });
});
