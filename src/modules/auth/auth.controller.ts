import { Controller, Post, Body, HttpCode, UseGuards, Query, Req, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { LoginModelDto } from '../../common/models/login.model.dto';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { TokenDto } from '../../common/models/token.dto';
import { UserEntity } from '../../entities/users.entity';
import { CreateUserDto } from '../../common/models/create-user.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { WINSTON_LOGGER } from '../logger/logger.module';
import { Logger } from 'winston';

@ApiTags('Auth')
@Controller('api/auth')
export class AuthController {

    constructor(
        @Inject(WINSTON_LOGGER) private readonly logger: Logger,
        private readonly authService: AuthService,
    ) { }

    /**
     * Authenticates a user and returns a JWT access and refresh token.
     * @param loginModel User login credentials (username and password)
     * @returns JWT access and refresh token
     */
    @Post('login')
    @HttpCode(200)
    @ApiOperation({ summary: 'Authenticate user and return JWT tokens.' })
    @ApiBody({ type: LoginModelDto })
    @ApiResponse({ status: 200, description: 'JWT access and refresh token returned.' })
    async userLogin(@Body() loginModel: LoginModelDto): Promise<TokenDto> {
        this.logger.info(`[${AuthController.name}].${this.userLogin.name} => Start`);
        this.logger.debug(`[${AuthController.name}].${this.userLogin.name} => ` +
            ` User: '${JSON.stringify(loginModel)}'`);

        const token = await this.authService.login(loginModel);

        this.logger.info(`[${AuthController.name}].${this.userLogin.name} => Finish`);
        return token;
    }

    /**
     * Changes the password for the currently authenticated user.
     * @param request Express request containing the authenticated user
     * @param password New password to set
     */
    @Post('change-password')
    @UseGuards(AuthGuard('jwt'))
    @HttpCode(200)
    @ApiOperation({ summary: 'Change password for the authenticated user.' })
    @ApiQuery({ name: 'password', type: String })
    @ApiResponse({ status: 200, description: 'Password changed successfully.' })
    async changePassword(@Req() request: Request, @Query('password') password: string) {
        // tslint:disable-next-line: no-string-literal
        const user = request['user'] as UserEntity;
        this.logger.info(`[${AuthController.name}].${this.changePassword.name} => Start`);
        this.logger.debug(`[${AuthController.name}].${this.changePassword.name} => User = '${JSON.stringify(user)}'`);
        await this.authService.changePassword(user.username, password);
        this.logger.info(`[${AuthController.name}].${this.changePassword.name} => Finish`);
    }

    /**
     * Refreshes the JWT access token using a valid refresh token.
     * @param token The refresh token
     * @returns New JWT access and refresh token
     */
    @Post('refresh-token')
    @ApiOperation({ summary: 'Refresh JWT access token using a refresh token.' })
    @ApiQuery({ name: 'token', type: String })
    @ApiResponse({ status: 200, description: 'New JWT access and refresh token returned.' })
    public async refreshToken(@Query('token') token: string): Promise<TokenDto> {
        if (!token || token === '') {
            throw new HttpException('Token parameter is mandatory', HttpStatus.BAD_REQUEST);
        }
        return await this.authService.loginByRefreshToken(token);
    }

    /**
     * Creates a new user. Only accessible by admin users.
     * @param createUserDto New user data (name, role, password)
     * @returns The created user entity
     */
    @Post('create-user')
    @UseGuards(AuthGuard('jwt'), RolesGuard(['admin']))
    @HttpCode(201)
    @ApiOperation({ summary: 'Create a new user (admin only).' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, description: 'User created successfully.' })
    async createUser(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
        this.logger.info(`[${AuthController.name}].${this.createUser.name} => Start`);
        this.logger.debug(`[${AuthController.name}].${this.createUser.name} => ` +
            `User: '${JSON.stringify(createUserDto)}'`);

        const newUser = await this.authService.createNewUser(createUserDto.name, createUserDto.role, createUserDto.password);

        this.logger.info(`[${AuthController.name}].${this.createUser.name} => Finish`);
        return newUser;
    }
}
