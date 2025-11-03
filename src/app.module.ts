import { PowerDataModule } from './modules/power-data/power-data.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config/config.module';
import { LoggerModule } from './modules/logger/logger.module';
import { ConfigService } from './config/config.service';
import * as ormConfig from './ormconfig';
import { AuthModule } from './modules/auth/auth.module';
import { ScheduledTasksModule } from './modules/scheduled-tasks/scheduled-tasks.module';
import { SocketModule } from './modules/socket/socket.module';
import { InfoModule } from './modules/info/info.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import KeyvRedis from '@keyv/redis';

@Module({
    imports: [
        CacheModule.registerAsync({
            isGlobal: true,
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return {
                    stores: [new KeyvRedis(configService.redisUri)],
                };
            },
        }),
        ConfigModule,
        LoggerModule,
        AuthModule,
        ScheduledTasksModule,
        PowerDataModule,
        SocketModule,
        InfoModule,
        ScheduleModule.forRoot(),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: () => ormConfig,
            inject: [ConfigService],
        }),
    ],
    controllers: [],
})
export class AppModule {}
