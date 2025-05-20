import { Module } from '@nestjs/common';
import { SocketService } from './socket.service';
import { LoggerModule } from '../logger/logger.module';
import { ConfigModule } from '../config/config.module';
import { CollectDataModule } from '../collect-data/collect-data.module';

@Module({
  imports: [
    LoggerModule,
    ConfigModule,
    CollectDataModule,
  ],
  controllers: [],
  providers: [SocketService],
  exports: [],
})
export class SocketModule { }
