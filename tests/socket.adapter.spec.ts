import { expect } from 'chai';
import * as sinon from 'sinon';
import { SocketIoAdapter } from '../src/modules/socket/socket.adapter';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions, Server } from 'socket.io';

describe('SocketIoAdapter', () => {
    let configStub: any;
    let adapter: SocketIoAdapter;
    let createStub: sinon.SinonStub;
    const fakeServer = {} as Server;

    beforeEach(() => {
        // stub config with allowOrigins
        configStub = { allowOrigins: ['http://localhost'] };
        // stub IoAdapter.createIOServer
        createStub = sinon.stub(IoAdapter.prototype, 'createIOServer').returns(fakeServer);
        // instantiate adapter with dummy app context
        adapter = new SocketIoAdapter({} as any, configStub);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should set CORS and allowEIO3 options and return server', () => {
        const port = 3000;
        const options: ServerOptions = {
            transports: ['websocket'],
            path: '',
            serveClient: false,
            adapter: undefined,
            parser: undefined,
            connectTimeout: 0,
            connectionStateRecovery: {
                maxDisconnectionDuration: 0,
                skipMiddlewares: false,
            },
            cleanupEmptyChildNamespaces: false,
        };
        const result = adapter.createIOServer(port, options as any);
        // verify that super.createIOServer was called with modified options
        expect(createStub.calledOnce).to.be.true;
        const callArgs = createStub.firstCall.args;
        expect(callArgs[0]).to.equal(port);
        // options object passed to super should include cors and allowEIO3
        const passedOptions = callArgs[1] as ServerOptions;
        expect(passedOptions.cors).to.deep.equal({
            credentials: true,
            origin: configStub.allowOrigins,
        });
        expect(passedOptions.allowEIO3).to.be.true;
        // transports preserved from original options
        expect(passedOptions.transports).to.deep.equal(['websocket']);
        // result should be fakeServer
        expect(result).to.equal(fakeServer);
    });
});
