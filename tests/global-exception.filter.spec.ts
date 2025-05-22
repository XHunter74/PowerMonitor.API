import { expect } from 'chai';
import * as sinon from 'sinon';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { Logger } from 'winston';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';

describe('GlobalExceptionFilter', () => {
    let loggerStub: sinon.SinonStubbedInstance<Logger>;
    let filter: GlobalExceptionFilter;
    let mockResponse: any;
    let mockRequest: any;
    let mockHost: ArgumentsHost;

    beforeEach(() => {
        loggerStub = {
            error: sinon.stub(),
        } as any;
        filter = new GlobalExceptionFilter(loggerStub as any);
        mockRequest = { url: '/test-url' };
        mockResponse = { status: sinon.stub().returnsThis(), json: sinon.stub() };
        mockHost = {
            switchToHttp: () => ({
                getRequest: () => mockRequest,
                getResponse: () => mockResponse,
            }),
        } as any;
    });

    it('should handle generic error and log it', () => {
        const error = new Error('Something went wrong');
        filter.catch(error, mockHost);
        expect(loggerStub.error.calledOnce).to.be.true;
        const logArg = loggerStub.error.firstCall.args[0];
        expect(logArg).to.include('Exception thrown');
        expect(mockResponse.status.calledWith(HttpStatus.INTERNAL_SERVER_ERROR)).to.be.true;
        expect(mockResponse.json.calledOnce).to.be.true;
        const jsonArg = mockResponse.json.firstCall.args[0];
        expect(jsonArg.statusCode).to.equal(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(jsonArg.path).to.equal('/test-url');
        expect(jsonArg.message).to.equal('Internal server error');
    });

    it('should handle HttpException and log it', () => {
        const httpException = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        filter.catch(httpException, mockHost);
        expect(loggerStub.error.calledOnce).to.be.true;
        expect(mockResponse.status.calledWith(HttpStatus.FORBIDDEN)).to.be.true;
        expect(mockResponse.json.calledOnce).to.be.true;
        const jsonArg = mockResponse.json.firstCall.args[0];
        expect(jsonArg.statusCode).to.equal(HttpStatus.FORBIDDEN);
        expect(jsonArg.message).to.equal('Forbidden');
    });

    it('should serialize error objects', () => {
        const error = new Error('Test error');
        const result = (filter as any).serializeError(error);
        expect(result).to.have.property('name', 'Error');
        expect(result).to.have.property('message', 'Test error');
        expect(result).to.have.property('stack');
    });

    it('should return non-error objects as is in serializeError', () => {
        const obj = { foo: 'bar' };
        const result = (filter as any).serializeError(obj);
        expect(result).to.equal(obj);
    });
});
