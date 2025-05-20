import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/users.entity';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '../../modules/config/config.service';
import { JwtStrategy } from './jwt.strategy';
import { UtilsService } from './utils.service';
import { UserTokensEntity } from '../../entities/user-tokens.entity';

const config = new ConfigService();
@Module({
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([UserEntity, UserTokensEntity]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secretOrPrivateKey: config.TokenSecretKey,
      signOptions: {
        expiresIn: config.TokenLifeTime,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [ConfigService, AuthService, JwtStrategy, UtilsService],
  exports: [PassportModule, AuthService],
})
export class AuthModule { }
