import { expect } from 'chai';
import * as sinon from 'sinon';
import { AuthController } from '../../src/modules/auth/auth.controller';
import { AuthService } from '../../src/modules/auth/auth.service';
import { Logger } from 'winston';
import { Request } from 'express';
import { CreateUserDto } from '../../src/common/models/dto/create-user.dto';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('AuthController', () => {
    let authController: AuthController;
    let authServiceStub: sinon.SinonStubbedInstance<AuthService>;
    let loggerStub: sinon.SinonStubbedInstance<Logger>;

    beforeEach(() => {
        authServiceStub = {
            login: sinon.stub(),
            changePassword: sinon.stub(),
            loginByRefreshToken: sinon.stub(),
            createNewUser: sinon.stub(),
        } as any;
        loggerStub = {
            info: sinon.stub(),
            debug: sinon.stub(),
        } as any;
        authController = new AuthController(loggerStub, authServiceStub as any);
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('userLogin', () => {
        it('should return token on successful login', async () => {
            const tokenDto = { token: 'jwt', refreshToken: 'rt', expiresIn: 3600 };
            (authServiceStub.login as sinon.SinonStub).resolves(tokenDto);
            const result = await authController.userLogin({ username: 'u', password: 'p' });
            expect(authServiceStub.login.calledOnce).to.be.true;
            expect(result).to.equal(tokenDto);
        });
    });

    describe('changePassword', () => {
        it('should change password for authenticated user', async () => {
            const req = { user: { username: 'usr' } } as unknown as Request;
            (authServiceStub.changePassword as sinon.SinonStub).resolves();
            await authController.changePassword(req, 'newpass');
            expect(authServiceStub.changePassword.calledOnceWith('usr', 'newpass')).to.be.true;
        });
    });

    describe('refreshToken', () => {
        it('should throw if token query param missing', async () => {
            try {
                await authController.refreshToken('');
                expect.fail('Should throw');
            } catch (err) {
                expect(err).to.be.instanceOf(HttpException);
                expect((err as HttpException).getStatus()).to.equal(HttpStatus.BAD_REQUEST);
            }
        });

        it('should refresh token when valid', async () => {
            const tokenDto = { token: 'jwt2', refreshToken: 'rt2', expiresIn: 3600 };
            (authServiceStub.loginByRefreshToken as sinon.SinonStub).resolves(tokenDto);
            const result = await authController.refreshToken('valid');
            expect(authServiceStub.loginByRefreshToken.calledOnceWith('valid')).to.be.true;
            expect(result).to.equal(tokenDto);
        });
    });

    describe('createUser', () => {
        it('should create a new user and return it', async () => {
            const dto: CreateUserDto = { name: 'new', role: 'user', password: 'pass' };
            const userEntity = { id: 1, username: 'new', role: 'USER', password: null };
            (authServiceStub.createNewUser as sinon.SinonStub).resolves(userEntity);
            const result = await authController.createUser(dto);
            expect(authServiceStub.createNewUser.calledOnceWith('new', 'user', 'pass')).to.be.true;
            expect(result).to.equal(userEntity);
        });
    });
});
