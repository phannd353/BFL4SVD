import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { JsonWebTokenError } from '@nestjs/jwt';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  public catch(exception: HttpException, host: ArgumentsHost) {
    const req = host.switchToHttp().getRequest<Request>();
    const response = host.switchToHttp().getResponse<Response>();
    // Retrieve the exception from passport Strategy (if any)
    // @ts-ignore
    const err = req.authInfo || exception;
    const args = req.body;

    let status = this.getHttpStatus(err);
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      if (err instanceof JsonWebTokenError) {
        status = HttpStatus.UNAUTHORIZED;
        this.logger.log(err.message, 'JWTError');
      } else {
        // Error Notifications
        this.logger.error('UnhandledException', err);
      }
    }

    let message: string = err.message?.toString() || '';
    if (err.message.includes('ThrottlerException')) {
      message = message.replace('ThrottlerException: ', '');
    }

    return response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: req.url,
      message,
    });
  }

  private getHttpStatus(exception: unknown): HttpStatus {
    return exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
