import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Server } from 'socket.io';
import { ConfigService } from '../config/config.service';

export class SocketIoAdapter extends IoAdapter {
    constructor(
        app: INestApplicationContext,
        private config: ConfigService,
    ) {
        super(app);
    }

    createIOServer(port: number, options?: ServerOptions): Server {
        options.cors = { credentials: true, origin: this.config.allowOrigins };
        options.allowEIO3 = true;
        const server = super.createIOServer(port, options) as Server;
        return server;
    }
}
