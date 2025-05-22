import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from './config/config.service';

const config = new ConfigService();

const ormConfig: TypeOrmModuleOptions = {
    type: config.databaseType,
    host: config.databaseHost,
    port: config.databasePort,
    username: config.databaseUser,
    password: config.databaseUserPassword,
    database: config.databaseName,
    entities: [__dirname + '/entities/*.entity{.ts,.js}'],
    synchronize: true,
    migrationsRun: true,
    migrationsTableName: 'migrations',
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    autoLoadEntities: true,
};

export = ormConfig;
