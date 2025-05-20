import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from './modules/config/config.service';

const config = new ConfigService();

const ormConfig: TypeOrmModuleOptions = {
    type: config.DatabaseType,
    host: config.DatabaseHost,
    port: config.DatabasePort,
    username: config.DatabaseUser,
    password: config.DatabaseUserPassword,
    database: config.DatabaseName,
    entities: [__dirname + '/entity/*.entity{.ts,.js}'],
    synchronize: true,
    migrationsRun: true,
    migrationsTableName: 'migrations',
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    autoLoadEntities: true,
    // cli: {
    //     // Location of migration should be inside src folder
    //     // to be compiled into dist/ folder.
    //     migrationsDir: 'src/migrations',
    // },
};

export = ormConfig;
