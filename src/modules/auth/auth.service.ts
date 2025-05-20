import { JwtService } from '@nestjs/jwt';
import { Injectable, UnauthorizedException, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { LoginModelDto } from '../../common/models/login.model.dto';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../entities/users.entity';
import { Repository } from 'typeorm';
import { JwtPayload } from '../../common/models/jwt-payload.interface';
import { TokenDto } from '../../common/models/token.dto';
import { UtilsService } from './utils.service';
import { ConfigService } from '../../modules/config/config.service';
import { UserTokensEntity } from '../../entities/user-tokens.entity';
import TokenGenerator = require('uuid-token-generator');
import moment = require('moment');
import { LogMethod } from '../../common/decorators/log-method.decorator';
import { WINSTON_LOGGER } from '../../modules/logger/logger.module';
import { Logger } from 'winston';

@Injectable()
export class AuthService {

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly jwtService: JwtService,
        private readonly utilsService: UtilsService,
        private readonly config: ConfigService,
        @InjectRepository(UserEntity) private usersRepository: Repository<UserEntity>,
        @InjectRepository(UserTokensEntity) private tokensRepository: Repository<UserTokensEntity>,
    ) { }

    @LogMethod()
    async login(loginModel: LoginModelDto): Promise<TokenDto> {
        const user = await this.usersRepository.findOne({ where: { username: loginModel.username } });
        if (!user || !bcrypt.compareSync(loginModel.password, user.password)) {
            throw new UnauthorizedException('Invalid UserName/Password');
        }
        return await this.createUserToken(user.username, user.role);
    }

    @LogMethod()
    async loginByRefreshToken(refreshToken: string): Promise<TokenDto> {
        const tokenInDb = await this.tokensRepository.findOne({ relations: ['user'], where: { token: refreshToken } });
        if (!tokenInDb || moment(tokenInDb.created).add(this.config.refreshTokenLifeTime, 's') < moment()) {
            throw new HttpException('Token is expired or does not exist', HttpStatus.UNAUTHORIZED);
        }
        await this.tokensRepository.remove(tokenInDb);
        return await this.createUserToken(tokenInDb.user.username, tokenInDb.user.role);
    }

    private async createUserToken(username: string, role: string): Promise<TokenDto> {
        const jwtPayload: JwtPayload = { username, role };
        const token = new TokenDto();
        token.token = this.jwtService.sign(jwtPayload);
        token.refreshToken = await this.createRefreshToken(username);
        token.expiresIn = this.config.tokenLifeTime;
        return token;
    }

    private async createRefreshToken(username: string): Promise<string> {
        this.logger.info(`[${AuthService.name}].${this.createRefreshToken.name} => Start`);
        const userInDb = await this.usersRepository.findOne({
            where: { username },
        });
        if (!userInDb) {
            this.logger.error(`[${AuthService.name}].${this.createRefreshToken.name} => ` +
                `Error: User '${username}' does not exists`);
            throw new HttpException('User does not exists', HttpStatus.BAD_REQUEST);
        }

        const tokenGenerator = new TokenGenerator(1024, TokenGenerator.BASE62);
        const token = tokenGenerator.generate();

        const contactToken = new UserTokensEntity();
        contactToken.user = userInDb;
        contactToken.token = token;
        contactToken.created = new Date();
        await this.tokensRepository.save(contactToken);
        this.logger.info(`[${AuthService.name}].${this.createRefreshToken.name} => Finish`);
        return token;
    }

    async validateUser(payload: JwtPayload): Promise<UserEntity> {
        const user = await this.usersRepository.findOne({ where: { username: payload.username } });
        return user;
    }

    @LogMethod()
    async changePassword(username: string, newPassword: string) {
        const user = await this.usersRepository.findOne({ where: { username } });
        user.password = await this.utilsService.createHash(newPassword);
        await this.usersRepository.save(user);
    }

    @LogMethod()
    async createNewUser(userName: string, role: string, password: string): Promise<UserEntity> {
        const hashedPassword = await this.utilsService.createHash(password);

        let newUser = this.usersRepository.create({
            username: userName,
            role: role.toUpperCase(),
            password: hashedPassword,
        });

        newUser = await this.usersRepository.save(newUser);
        newUser.password = null;
        return newUser;
    }
}
