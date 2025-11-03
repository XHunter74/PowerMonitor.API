import * as chai from 'chai';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { AuthService } from '../../src/modules/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { UtilsService } from '../../src/modules/auth/utils.service';
import { ConfigService } from '../../src/config/config.service';
import { Repository } from 'typeorm';
import { Logger } from 'winston';
import { UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { Cache } from 'cache-manager';

chai.use(sinonChai);
const expect = chai.expect;

// Mocks
function createRepositoryMock() {
    return {
        findOne: sinon.stub(),
        save: sinon.stub(),
        create: sinon.stub(),
        remove: sinon.stub(),
    } as unknown as sinon.SinonStubbedInstance<Repository<any>>;
}

describe('AuthService', () => {
    let authService: AuthService;
    let jwtService: sinon.SinonStubbedInstance<JwtService>;
    let utilsService: sinon.SinonStubbedInstance<UtilsService>;
    let configService: Partial<ConfigService>;
    let usersRepository: any;
    let tokensRepository: any;
    let logger: Partial<Logger>;
    let cacheManager: Partial<Cache>;

    beforeEach(() => {
        jwtService = {
            sign: sinon.stub().returns('jwt-token'),
        } as any;
        utilsService = {
            createHash: sinon.stub().resolves('hashed'),
        } as any;
        configService = {
            tokenLifeTime: 3600,
            refreshTokenLifeTime: 7200,
        };
        usersRepository = createRepositoryMock();
        tokensRepository = createRepositoryMock();
        logger = {
            info: sinon.stub().callsFake((...args: any[]) => {}),
            error: sinon.stub().callsFake((...args: any[]) => {}),
            warn: sinon.stub().callsFake((...args: any[]) => {}),
            debug: sinon.stub().callsFake((...args: any[]) => {}),
        };
        cacheManager = {
            set: sinon.stub().resolves(),
            get: sinon.stub().resolves(undefined),
            del: sinon.stub().resolves(),
            reset: sinon.stub().resolves(),
            wrap: sinon.stub(),
        } as any;

        authService = new AuthService(
            logger as any,
            jwtService as any,
            utilsService as any,
            configService as ConfigService,
            usersRepository,
            tokensRepository,
            cacheManager as any,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('login', () => {
        it('should throw UnauthorizedException if user not found', async () => {
            usersRepository.findOne.resolves(null);
            try {
                await authService.login({ username: 'user', password: 'pass' });
                expect.fail('Should throw');
            } catch (e) {
                expect(e).to.be.instanceOf(UnauthorizedException);
            }
        });
        it('should throw UnauthorizedException if password does not match', async () => {
            usersRepository.findOne.resolves({ username: 'user', password: 'hashed' });
            sinon.stub(require('bcrypt'), 'compareSync').returns(false);
            try {
                await authService.login({ username: 'user', password: 'wrong' });
                expect.fail('Should throw');
            } catch (e) {
                expect(e).to.be.instanceOf(UnauthorizedException);
            }
        });
        it('should return token if user and password are valid', async () => {
            usersRepository.findOne.resolves({
                username: 'user',
                password: 'hashed',
                role: 'ADMIN',
            });
            sinon.stub(require('bcrypt'), 'compareSync').returns(true);
            sinon.stub(authService as any, 'createUserToken').resolves('token');
            const result = await authService.login({ username: 'user', password: 'hashed' });
            expect(result).to.equal('token');
        });
    });

    describe('loginByRefreshToken', () => {
        it('should throw if token not found', async () => {
            tokensRepository.findOne.resolves(null);
            try {
                await authService.loginByRefreshToken('refresh');
                expect.fail('Should throw');
            } catch (e) {
                expect(e).to.be.instanceOf(HttpException);
                expect(e.getStatus()).to.equal(HttpStatus.UNAUTHORIZED);
            }
        });
        it('should throw if token is expired', async () => {
            const moment = require('moment');
            tokensRepository.findOne.resolves({
                created: moment().subtract(8000, 'seconds').toDate(),
                user: { username: 'user', role: 'ADMIN' },
            });
            sinon.stub(configService, 'refreshTokenLifeTime').value(1); // 1 second
            try {
                await authService.loginByRefreshToken('refresh');
                expect.fail('Should throw');
            } catch (e) {
                expect(e).to.be.instanceOf(HttpException);
                expect(e.getStatus()).to.equal(HttpStatus.UNAUTHORIZED);
            }
        });
        it('should remove token and return new token if valid', async () => {
            const moment = require('moment');
            const tokenInDb = {
                created: moment().toDate(),
                user: { username: 'user', role: 'ADMIN' },
            };
            tokensRepository.findOne.resolves(tokenInDb);
            tokensRepository.remove.resolves();
            sinon.stub(authService as any, 'createUserToken').resolves('token');
            const result = await authService.loginByRefreshToken('refresh');
            expect(result).to.equal('token');
        });
    });

    describe('validateUser', () => {
        it('should return user if found', async () => {
            usersRepository.findOne.resolves({ username: 'user' });
            const result = await authService.validateUser({ username: 'user', role: 'ADMIN' });
            expect(result).to.deep.equal({ username: 'user' });
        });
        it('should return null if not found', async () => {
            usersRepository.findOne.resolves(null);
            const result = await authService.validateUser({ username: 'user', role: 'ADMIN' });
            expect(result).to.be.null;
        });
    });

    describe('changePassword', () => {
        it('should update user password', async () => {
            usersRepository.findOne.resolves({ username: 'user', password: 'old' });
            usersRepository.save.resolves();
            await authService.changePassword('user', 'newpass');
            expect(utilsService.createHash.calledWith('newpass')).to.be.true;
            expect(usersRepository.save.calledOnce).to.be.true;
        });
    });

    describe('createNewUser', () => {
        it('should create and save new user', async () => {
            utilsService.createHash.resolves('hashed');
            usersRepository.create.returns({ username: 'user', role: 'ADMIN', password: 'hashed' });
            usersRepository.save.resolves({ username: 'user', role: 'ADMIN', password: null });
            const result = await authService.createNewUser('user', 'admin', 'pass');
            expect(result).to.deep.equal({ username: 'user', role: 'ADMIN', password: null });
        });
    });

    describe('createRefreshToken (private)', () => {
        let TokenGenerator: any;
        beforeEach(() => {
            // stub token generator to return fixed token
            TokenGenerator = require('uuid-token-generator');
            sinon.stub(TokenGenerator.prototype, 'generate').returns('fixed-refresh');
        });
        afterEach(() => {
            sinon.restore();
        });

        it('should throw HttpException if user not found', async () => {
            usersRepository.findOne.resolves(null);
            try {
                // pass null to simulate missing user
                await (authService as any).createRefreshToken(null);
                expect.fail('Should throw');
            } catch (e) {
                expect(e).to.be.instanceOf(HttpException);
                expect(e.getStatus()).to.equal(HttpStatus.BAD_REQUEST);
            }
        });

        it('should generate and save a refresh token for existing user', async () => {
            const fakeUser = { username: 'user' };
            usersRepository.findOne.resolves(fakeUser);
            tokensRepository.save.resolvesArg(0);
            const token = await (authService as any).createRefreshToken(fakeUser);
            expect(token).to.equal('fixed-refresh');
            // ensure save called with a UserTokensEntity having our token
            const saved = (tokensRepository.save as sinon.SinonStub).getCall(0).args[0];
            expect(saved).to.have.property('token', 'fixed-refresh');
            expect(saved).to.have.property('user', fakeUser);
        });
    });

    describe('createUserToken (private)', () => {
        beforeEach(() => {
            // stub createRefreshToken to return known value
            sinon.stub(authService as any, 'createRefreshToken').resolves('refresh-abc');
            // stub jwtService.sign to return known token
            (jwtService.sign as sinon.SinonStub).returns('jwt-abc');
        });
        afterEach(() => {
            sinon.restore();
        });

        it('should produce a TokenDto with correct fields', async () => {
            const userObj = { username: 'bob', role: 'USER' };
            const tokenDto = await (authService as any).createUserToken(userObj, 'USER');
            expect(tokenDto).to.have.property('token', 'jwt-abc');
            expect(tokenDto).to.have.property('refreshToken', 'refresh-abc');
            expect(tokenDto).to.have.property('expiresIn', configService.tokenLifeTime);
        });

        it('should call jwtService.sign with correct payload', async () => {
            const userObj = { username: 'alice', role: 'ADMIN' };
            await (authService as any).createUserToken(userObj, 'ADMIN');
            expect(jwtService.sign.calledOnce).to.be.true;
            expect(jwtService.sign).to.have.been.calledWithExactly({
                username: 'alice',
                role: 'ADMIN',
            });
        });
    });
});
