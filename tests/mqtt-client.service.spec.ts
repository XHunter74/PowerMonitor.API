import { expect } from 'chai';
import * as sinon from 'sinon';
import { MqttClientService } from '../src/modules/mqtt/mqtt-client.service';
import { SensorsDataModel } from '../src/common/models/sensors-data.model';

describe('MqttClientService', () => {
    let service: MqttClientService;
    let logger: any;
    let config: any;
    let powerDataService: any;
    let energyMeteringService: any;
    let servicesService: any;
    let collectDataService: any;
    let mqttConnectionService: any;
    let subscription: any;

    beforeEach(() => {
        logger = { info: sinon.stub(), debug: sinon.stub(), error: sinon.stub() };
        config = { isDevEnvironment: false };
        powerDataService = {
            getPowerDataHourly: sinon.stub().resolves([{ power: 1 }]),
            getPowerDataDaily: sinon.stub().resolves([{ power: 2 }]),
        };
        energyMeteringService = { getCurrentPowerConsumptionData: sinon.stub().resolves(3) };
        servicesService = { getSystemUptimeSeconds: sinon.stub().returns(123) };
        collectDataService = {
            SerialPortState: true,
            getSensorsData: { subscribe: sinon.stub().returns({ unsubscribe: sinon.stub() }) },
        };
        mqttConnectionService = {
            onConnect: sinon.stub(),
            onError: sinon.stub(),
            isConnected: sinon.stub().returns(true),
            publish: sinon.stub(),
        };
        subscription = { unsubscribe: sinon.stub() };
        collectDataService.getSensorsData.subscribe.returns(subscription);
        service = new MqttClientService(
            logger,
            config,
            powerDataService,
            energyMeteringService,
            servicesService,
            collectDataService,
            mqttConnectionService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('publishPowerData publishes if not dev and connected', async () => {
        sinon.stub(service as any, 'getMqttData').resolves({});
        await service.publishPowerData();
        expect(mqttConnectionService.publish.calledOnce).to.be.true;
    });

    it('publishCurrentAndVoltageData publishes if not dev and connected', () => {
        // SensorsData requires voltage, amperage, power, powerCoefficient
        const sensorsData = new SensorsDataModel(220, 5, 0, 1);
        service.publishCurrentAndVoltageData(sensorsData);
        expect(mqttConnectionService.publish.calledOnce).to.be.true;
    });

    it('getMqttData returns correct structure', async () => {
        powerDataService.getPowerDataHourly.resolves([{ power: 1.23 }]);
        powerDataService.getPowerDataDaily.resolves([{ power: 2.34 }]);
        energyMeteringService.getCurrentPowerConsumptionData.resolves(5.67);
        servicesService.getSystemUptimeSeconds.returns(456);
        collectDataService.SerialPortState = false;
        const result = await (service as any).getMqttData();
        expect(result).to.have.property('Today', 1.23);
        expect(result).to.have.property('Monthly', 2.34);
        expect(result).to.have.property('PowerData', 5.67);
        expect(result).to.have.property('Uptime', 456);
        expect(result).to.have.property('SerialState', 0);
    });

    it('processApplicationShutdown unsubscribes and logs', () => {
        service['clientSubscription'] = subscription;
        service.processApplicationShutdown('SIGTERM');
        expect(subscription.unsubscribe.calledOnce).to.be.true;
        expect(service['clientSubscription']).to.be.null;
        expect(logger.info.callCount).to.be.greaterThan(1);
    });
});
