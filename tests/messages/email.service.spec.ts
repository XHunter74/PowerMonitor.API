import { expect } from 'chai';
import * as sinon from 'sinon';
import { EmailService } from '../../src/modules/messages/email.service';
import { Logger } from 'winston';
import { ConfigService } from '../../src/config/config.service';
import * as nodemailer from 'nodemailer';

describe('EmailService', () => {
    let emailService: EmailService;
    let loggerStub: sinon.SinonStubbedInstance<Logger>;
    let configStub: Partial<ConfigService>;
    let createTransportStub: sinon.SinonStub;
    let sendMailStub: sinon.SinonStub;
    let smtpTransportMock: any;

    beforeEach(() => {
        loggerStub = {
            info: sinon.stub(),
            error: sinon.stub(),
        } as any;
        configStub = {
            toEmails: ['test1@example.com', 'test2@example.com'],
            smtpHost: 'smtp.example.com',
            smtpPort: 465,
            smtpUser: 'user',
            smtpPassword: 'pass',
            fromEmail: 'from@example.com',
        };
        sendMailStub = sinon.stub();
        smtpTransportMock = { sendMail: sendMailStub };
        createTransportStub = sinon.stub(nodemailer, 'createTransport').returns(smtpTransportMock);
        emailService = new EmailService(loggerStub as any, configStub as ConfigService);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should send error emails to all recipients', () => {
        sendMailStub.yields(null, { messageId: '123', response: 'OK' });
        emailService.sendErrorEmailMessage();
        expect(sendMailStub.callCount).to.equal(2);
        expect(sendMailStub.firstCall.args[0].to).to.equal('test1@example.com');
        expect(sendMailStub.secondCall.args[0].to).to.equal('test2@example.com');
        expect(loggerStub.info.calledWithMatch(sinon.match('Start'))).to.be.true;
        expect(loggerStub.info.calledWithMatch(sinon.match('Finish'))).to.be.true;
    });

    it('should log error if sendMail fails', () => {
        sendMailStub.yields(new Error('fail'), null);
        emailService['sendEmail']('fail@example.com', 'subject', 'body');
        expect(loggerStub.error.calledWithMatch(sinon.match('Error: Error: fail'))).to.be.true;
    });

    it('should log message info if sendMail succeeds', () => {
        sendMailStub.yields(null, { messageId: 'abc', response: 'SENT' });
        emailService['sendEmail']('ok@example.com', 'subject', 'body');
        expect(loggerStub.info.calledWithMatch(sinon.match("Message 'abc' sent: 'SENT'"))).to.be
            .true;
        expect(loggerStub.info.calledWithMatch(sinon.match('Finish'))).to.be.true;
    });
});
