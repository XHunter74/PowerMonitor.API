import { Module } from '@nestjs/common';
import { SocketService } from '../services/socket.service';
import { LoggerModule } from './logger.module';
import { ConfigModule } from './config.module';
import { CollectDataModule } from './collect-data.module';

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
