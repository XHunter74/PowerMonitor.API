import { Module } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PowerAvailabilityService } from '../../modules/power-data/power-availability.service';
import { PowerAvailability } from '../../entities/power-availability.entity';
import { CollectDataService } from './collect-data.service';
import { DataService } from './data.service';
import { ConfigModule } from '../../config/config.module';
import { ServerData } from '../../entities/server-data.entity';
import { VoltageAmperageData } from '../../entities/voltage-amperage-data.entity';
import { PowerData } from '../../entities/power-data.entity';
import { PowerAcc } from '../../entities/power-acc.entity';
import { MessagesModule } from '../messages/messages.module';
import { VoltageData } from '../../entities/voltage-data.entity';
import { SerialPortService } from './serial-port.service';

@Module({
    imports: [
        LoggerModule,
        ConfigModule,
        MessagesModule,
        TypeOrmModule.forFeature([
            PowerAvailability,
            ServerData,
            VoltageAmperageData,
            PowerData,
            PowerAcc,
            VoltageData,
        ]),
    ],
    controllers: [],
    providers: [PowerAvailabilityService, CollectDataService, DataService, SerialPortService],
    exports: [CollectDataService, PowerAvailabilityService, DataService],
})
export class CollectDataModule {}
