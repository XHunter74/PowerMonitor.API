import { expect } from 'chai';
import * as sinon from 'sinon';
import { Constants } from '../../src/config/constants';

describe('UtilsService', () => {
    let utilsService: any;
    let UtilsServiceClass: any;
    let hashStub: sinon.SinonStub;

    beforeEach(() => {
        // Stub bcrypt.hash before loading UtilsService to ensure hashAsync uses stub
        hashStub = sinon.stub(require('bcrypt'), 'hash');
        // Clear module cache so hashAsync is recreated with our stub
        delete require.cache[require.resolve('../../src/modules/auth/utils.service')];
        UtilsServiceClass = require('../../src/modules/auth/utils.service').UtilsService;
        utilsService = new UtilsServiceClass();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should create a hash with correct arguments', async () => {
        let calledArgs: any[] | undefined;
        hashStub.callsFake(function (password, cost, cb) {
            calledArgs = [password, cost];
            // Call cb on next tick to ensure assignment before assertion
            process.nextTick(() => cb(null, 'hashed-password'));
        });
        const result = await utilsService.createHash('my-password');
        expect(calledArgs).to.not.be.undefined;
        expect(calledArgs![0]).to.equal('my-password');
        expect(calledArgs![1]).to.equal(Constants.HashCostFactor);
        expect(result).to.equal('hashed-password');
    });

    it('should throw if bcrypt.hash fails', async () => {
        let called = false;
        hashStub.callsFake((password, cost, cb) => {
            called = true;
            process.nextTick(() => cb(new Error('fail')));
        });
        let errorCaught: any = undefined;
        try {
            await utilsService.createHash('fail');
        } catch (e) {
            errorCaught = e;
        }
        expect(called).to.be.true;
        expect(errorCaught).to.not.be.undefined;
        expect(errorCaught.message).to.equal('fail');
    });
});
