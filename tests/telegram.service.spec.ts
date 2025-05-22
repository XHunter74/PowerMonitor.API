import { expect } from 'chai';
import * as sinon from 'sinon';
import { TelegramService } from '../src/modules/messages/telegram.service';
import { Logger } from 'winston';
import { ConfigService } from '../src/modules/config/config.service';
import TelegramBot = require('node-telegram-bot-api');

describe('TelegramService', () => {
    let telegramService: TelegramService;
    let loggerStub: sinon.SinonStubbedInstance<Logger>;
    let configStub: Partial<ConfigService>;
    let sendMessageStub: sinon.SinonStub;
    let telegramBotStub: sinon.SinonStubbedInstance<TelegramBot>;

    beforeEach(() => {
        loggerStub = {
            info: sinon.stub(),
            error: sinon.stub(),
        } as any;
        configStub = {
            telegramToken: 'dummy-token',
            telegramChatId: 123456,
        };
        sendMessageStub = sinon.stub();
        telegramBotStub = {
            sendMessage: sendMessageStub,
        } as any;
        sinon.stub(TelegramBot.prototype, 'sendMessage').callsFake(sendMessageStub);
        telegramService = new TelegramService(loggerStub as any, configStub as ConfigService);
        // Replace the real bot with our stub
        (telegramService as any).telegramBot = telegramBotStub;
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should send a telegram message and log success', async () => {
        sendMessageStub.resolves({ message_id: 123 });
        await telegramService.sendTelegramMessage('test message');
        expect(sendMessageStub.calledOnceWith(123456, 'test message')).to.be.true;
        expect(loggerStub.info.calledWithMatch(sinon.match('Start'))).to.be.true;
        expect(
            loggerStub.info.calledWithMatch(sinon.match("Message '123' was sending successfully ")),
        ).to.be.true;
    });

    it('should log error if sendMessage throws', async () => {
        sendMessageStub.rejects(new Error('fail'));
        await telegramService.sendTelegramMessage('fail message');
        expect(loggerStub.error.calledWithMatch(sinon.match('Error: Error: fail'))).to.be.true;
    });
});
