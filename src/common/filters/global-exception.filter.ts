import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_LOGGER } from '../../modules/logger/logger.module';


@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(@Inject(WINSTON_LOGGER) private readonly logger: Logger) { }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.getResponse() as string;
    }

    this.logger.error(
      `Exception thrown: ${JSON.stringify({
        timestamp: new Date().toISOString(),
        path: request.url,
        status,
        message,
      })}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}