import { Module } from '@nestjs/common';
import { LoggerModule } from './logger.module';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities/users.entity';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '../services/config.service';
import { JwtStrategy } from '../services/jwt.strategy';
import { UtilsService } from '../services/utils.service';
import { UserTokensEntity } from '../entities/user-tokens.entity';

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
