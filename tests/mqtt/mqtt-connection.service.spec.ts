import { expect } from 'chai';
import * as sinon from 'sinon';
// Use proxyquire to inject dependencies
const proxyquire = require('proxyquire').noCallThru();

describe('MqttConnectionService', () => {
    let logger: any;
    let config: any;
    let mqttClient: any;
    let connectStub: any;
    let service: any; // loaded via proxyquire

    beforeEach(() => {
        logger = { info: sinon.stub(), error: sinon.stub() };
        config = {
            mqttServer: 'localhost',
            mqttPort: 1883,
            mqttUser: 'user',
            mqttPassword: 'pass',
            mqttClient: 'clientId',
        };
        mqttClient = {
            on: sinon.stub(),
            publish: sinon.stub(),
            end: sinon.stub(),
            connected: true,
        };
        connectStub = sinon.stub().returns(mqttClient);
        // Inject stubbed mqtt.connect before requiring the service
        const serviceModule = proxyquire('../../src/modules/mqtt/mqtt-connection.service', {
            mqtt: { connect: connectStub },
        });
        service = new serviceModule.MqttConnectionService(logger, config);
        // Override client instance to our stub
        service['client'] = mqttClient;
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should call logger.info on connect', () => {
        const connectCallback = mqttClient.on.withArgs('connect').args[0]?.[1];
        if (connectCallback) connectCallback();
        expect(logger.info.called).to.be.true;
    });

    it('should call logger.error on error', () => {
        const errorCallback = mqttClient.on.withArgs('error').args[0]?.[1];
        if (errorCallback) errorCallback({ message: 'fail' });
        expect(logger.error.called).to.be.true;
    });

    it('should call logger.info on close', () => {
        const closeCallback = mqttClient.on.withArgs('close').args[0]?.[1];
        if (closeCallback) closeCallback();
        expect(logger.info.called).to.be.true;
    });

    it('onConnect registers callback', () => {
        const cb = sinon.stub();
        service.onConnect(cb);
        expect(mqttClient.on.calledWith('connect', cb)).to.be.true;
    });

    it('onError registers callback', () => {
        const cb = sinon.stub();
        service.onError(cb);
        expect(mqttClient.on.calledWith('error', cb)).to.be.true;
    });

    it('isConnected returns client.connected', () => {
        mqttClient.connected = true;
        expect(service.isConnected()).to.be.true;
        mqttClient.connected = false;
        expect(service.isConnected()).to.be.false;
    });

    it('publish sends message if connected', () => {
        mqttClient.connected = true;
        service.publish('topic', 'msg', { qos: 1 });
        expect(mqttClient.publish.calledOnce).to.be.true;
    });

    it('publish logs error if not connected', () => {
        mqttClient.connected = false;
        service.publish('topic', 'msg', { qos: 1 });
        expect(logger.error.called).to.be.true;
    });

    it('disconnect calls client.end and logs', () => {
        service.disconnect();
        expect(mqttClient.end.calledOnce).to.be.true;
        expect(logger.info.called).to.be.true;
    });
});
