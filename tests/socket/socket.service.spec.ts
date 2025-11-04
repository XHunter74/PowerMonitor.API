import { expect } from 'chai';
import * as sinon from 'sinon';
import { SocketService } from '../../src/modules/socket/socket.service';
import { SensorsDataModel } from '../../src/shared/models/sensors-data.model';

describe('SocketService', () => {
    let service: SocketService;
    let logger: any;
    let collectDataService: any;
    let subscription: any;
    let serverMock: any;

    beforeEach(() => {
        logger = { info: sinon.stub() };
        subscription = { unsubscribe: sinon.stub(), closed: false };
        // Stub collectDataService.getSensorsData.subscribe
        const subscribeStub = sinon.stub().returns(subscription);
        collectDataService = { getSensorsData: { subscribe: subscribeStub } };
        service = new SocketService(logger as any, collectDataService as any);
        // Mock server.emit
        serverMock = { emit: sinon.stub() };
        (service as any).server = serverMock;
    });

    afterEach(() => {
        sinon.restore();
    });

    it('handleConnection increments clients and logs', () => {
        const client = { id: 'abc' };
        service.handleConnection(client as any);
        expect((service as any).clients).to.equal(1);
        expect(logger.info.calledOnce).to.be.true;
    });

    it('handleDisconnect decrements clients and unsubscribes on last client', () => {
        // Setup one client connected and subscription active
        (service as any).clients = 1;
        (service as any).clientSubscription = subscription;
        service.handleDisconnect({ id: 'abc' } as any);
        expect((service as any).clients).to.equal(0);
        expect(logger.info.callCount).to.be.at.least(2);
        expect(subscription.unsubscribe.calledOnce).to.be.true;
        expect((service as any).clientSubscription).to.be.null;
    });

    it('onSensorsData subscribes and emits data', () => {
        // First call: no existing subscription
        service.onSensorsData({ id: 'c1' } as any);
        expect(collectDataService.getSensorsData.subscribe.calledOnce).to.be.true;
        // Get callback passed to subscribe
        const callback = collectDataService.getSensorsData.subscribe.firstCall.args[0];
        const data = new SensorsDataModel(10, 2, 1);
        // Simulate data emission
        callback(data);
        expect(serverMock.emit.calledOnceWith('sensors-data', data)).to.be.true;
    });

    it('onSensorsData does not resubscribe if already subscribed', () => {
        // Pre-set subscription
        (service as any).clientSubscription = subscription;
        service.onSensorsData({ id: 'c1' } as any);
        expect(collectDataService.getSensorsData.subscribe.notCalled).to.be.true;
    });

    it('onCloseSensorsData logs info', () => {
        const client = { id: 'clientX' };
        service.onCloseSensorsData(client as any);
        expect(logger.info.calledOnce).to.be.true;
    });
});
