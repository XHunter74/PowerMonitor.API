import { expect } from 'chai';
import * as sinon from 'sinon';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { ExecutionContext } from '@nestjs/common';

describe('RolesGuard', () => {
    let context: sinon.SinonStubbedInstance<ExecutionContext>;
    let getRequestStub: sinon.SinonStub;
    let switchToHttpStub: sinon.SinonStub;

    beforeEach(() => {
        getRequestStub = sinon.stub();
        switchToHttpStub = sinon.stub().returns({ getRequest: getRequestStub });
        context = {
            switchToHttp: switchToHttpStub,
        } as any;
    });

    it('should allow access if user role matches (case-insensitive)', () => {
        getRequestStub.returns({ user: { role: 'ADMIN' } });
        const guard = RolesGuard(['admin']);
        expect(guard.canActivate(context as any)).to.be.true;
    });

    it('should deny access if user role does not match', () => {
        getRequestStub.returns({ user: { role: 'user' } });
        const guard = RolesGuard(['admin']);
        expect(guard.canActivate(context as any)).to.be.false;
    });

    it('should deny access if user is missing', () => {
        getRequestStub.returns({});
        const guard = RolesGuard(['admin']);
        expect(guard.canActivate(context as any)).to.be.false;
    });

    it('should allow access for any matching role in allowedRoles', () => {
        getRequestStub.returns({ user: { role: 'manager' } });
        const guard = RolesGuard(['admin', 'manager']);
        expect(guard.canActivate(context as any)).to.be.true;
    });
});
