import { PowerDataModule } from './modules/power-data.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './modules/config.module';
import { LoggerModule } from './modules/logger.module';
import { ConfigService } from './services/config.service';
import * as ormConfig from './ormconfig';
import { AuthModule } from './modules/auth.module';
import { ScheduledTasksModule } from './modules/scheduled-tasks.module';
import { SocketModule } from './modules/socket.module';
import { ServicesModule } from './modules/services.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheInterceptor, CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    CacheModule.register(),
    ConfigModule,
    LoggerModule,
    AuthModule,
    ScheduledTasksModule,
    PowerDataModule,
    SocketModule,
    ServicesModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async () => (ormConfig),
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
  ],
})
export class AppModule { }
