import { PowerDataModule } from './modules/power-data/power-data.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './modules/config/config.module';
import { LoggerModule } from './modules/logger/logger.module';
import { ConfigService } from './modules/config/config.service';
import * as ormConfig from './ormconfig';
import { AuthModule } from './modules/auth/auth.module';
import { ScheduledTasksModule } from './modules/scheduled-tasks/scheduled-tasks.module';
import { SocketModule } from './modules/socket/socket.module';
import { ServicesModule } from './modules/services/services.module';
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
            useFactory: () => ormConfig,
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
export class AppModule {}
