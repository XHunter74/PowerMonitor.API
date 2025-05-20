import { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { ConfigService } from '../config/config.service';

export class SocketIoAdapter extends IoAdapter {
    constructor(
        private app: INestApplicationContext,
        private config: ConfigService,
    ) {
        super(app);
    }

    createIOServer(port: number, options?: ServerOptions) {
        // port = this.config.ServicePort;
        options.cors = { credentials: true, origin: this.config.AllowOrigins };
        options.allowEIO3 = true;
        const server = super.createIOServer(port, options);
        return server;
    }
}
