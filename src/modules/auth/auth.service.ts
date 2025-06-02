import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
    Injectable,
    UnauthorizedException,
    HttpException,
    HttpStatus,
    Inject,
} from '@nestjs/common';
import { LoginModelDto } from '../../shared/dto/login.model.dto';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { UserEntity } from '../../entities/users.entity';
import { Repository } from 'typeorm';
import { JwtPayload } from './jwt-payload.interface';
import { TokenDto } from '../../shared/dto/token.dto';
import { UtilsService } from './utils.service';
import { ConfigService } from '../../config/config.service';
import { UserTokensEntity } from '../../entities/user-tokens.entity';
import TokenGenerator = require('uuid-token-generator');
import moment = require('moment');
import { LogMethod } from '../../shared/decorators/log-method.decorator';
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
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) {}

    @LogMethod()
    async login(loginModel: LoginModelDto): Promise<TokenDto> {
        const user = await this.usersRepository.findOne({
            where: { username: loginModel.username },
        });
        if (!user || !bcrypt.compareSync(loginModel.password, user.password)) {
            throw new UnauthorizedException('Invalid UserName/Password');
        }
        return await this.createUserToken(user, user.role);
    }

    @LogMethod()
    async loginByRefreshToken(refreshToken: string): Promise<TokenDto> {
        const tokenInDb = await this.tokensRepository.findOne({
            relations: ['user'],
            where: { token: refreshToken },
        });
        if (
            !tokenInDb ||
            moment(tokenInDb.created).add(this.config.refreshTokenLifeTime, 's') < moment()
        ) {
            throw new HttpException('Token is expired or does not exist', HttpStatus.UNAUTHORIZED);
        }
        await this.tokensRepository.remove(tokenInDb);
        return await this.createUserToken(tokenInDb.user, tokenInDb.user.role);
    }

    private async createUserToken(user: UserEntity, role: string): Promise<TokenDto> {
        const username = user.username;
        const jwtPayload: JwtPayload = { username, role };
        const token = new TokenDto();
        token.token = this.jwtService.sign(jwtPayload);
        token.refreshToken = await this.createRefreshToken(user);
        token.expiresIn = this.config.tokenLifeTime;
        return token;
    }

    private async createRefreshToken(user: UserEntity): Promise<string> {
        this.logger.info(`[${AuthService.name}].${this.createRefreshToken.name} => Start`);

        const tokenGenerator = new TokenGenerator(1024, TokenGenerator.BASE62);
        const token = tokenGenerator.generate();

        const contactToken = new UserTokensEntity();
        contactToken.user = user;
        contactToken.token = token;
        contactToken.created = new Date();
        await this.tokensRepository.save(contactToken);

        if (this.cacheManager) {
            await this.cacheManager.set(
                `refreshToke-${user.id}`,
                `refreshToken:${token}`,
                this.config.refreshTokenLifeTime,
            );
        }

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
