import { Controller, Post, Body, HttpCode, UseGuards, Query, Req, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Request } from 'express';
import { LoginModelDto } from '../models/login.model.dto';
import { AuthService } from '../services/auth.service';
import { AuthGuard } from '@nestjs/passport';
import { TokenDto } from '../models/token.dto';
import { UserEntity } from '../entities/users.entity';
import { CreateUserDto } from '../models/create-user.dto';
import { RolesGuard } from '../guards/roles.guard';
import { WINSTON_LOGGER } from '../modules/logger.module';
import { Logger } from 'winston';

@Controller('api/auth')
export class AuthController {

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly authService: AuthService,
    ) { }

    @Post('login')
    @HttpCode(200)
    async userLogin(@Body() loginModel: LoginModelDto): Promise<TokenDto> {
        this.logger.info(`[${AuthController.name}].${this.userLogin.name} => Start`);
        this.logger.debug(`[${AuthController.name}].${this.userLogin.name} => ` +
            ` User: '${JSON.stringify(loginModel)}'`);

        const token = await this.authService.login(loginModel);

        this.logger.info(`[${AuthController.name}].${this.userLogin.name} => Finish`);
        return token;
    }

    @Post('change-password')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    async changePassword(@Req() request: Request, @Query('password') password: string) {
        // tslint:disable-next-line: no-string-literal
        const user = request['user'] as UserEntity;
        this.logger.info(`[${AuthController.name}].${this.changePassword.name} => Start`);
        this.logger.debug(`[${AuthController.name}].${this.changePassword.name} => User = '${JSON.stringify(user)}'`);
        await this.authService.changePassword(user.username, password);
        this.logger.info(`[${AuthController.name}].${this.changePassword.name} => Finish`);
    }

    @Post('refresh-token')
    public async refreshToken(@Query('token') token: string): Promise<TokenDto> {
        if (!token || token === '') {
            throw new HttpException('Token parameter is mandatory', HttpStatus.BAD_REQUEST);
        }
        return await this.authService.loginByRefreshToken(token);
    }

    @Post('create-user')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @HttpCode(201)
    async createUser(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
        this.logger.info(`[${AuthController.name}].${this.createUser.name} => Start`);
        this.logger.debug(`[${AuthController.name}].${this.createUser.name} => ` +
            `User: '${JSON.stringify(createUserDto)}'`);

        const newUser = await this.authService.createNewUser(createUserDto.name, createUserDto.role, createUserDto.password);

        this.logger.info(`[${AuthController.name}].${this.createUser.name} => Finish`);
        return newUser;
    }
}
