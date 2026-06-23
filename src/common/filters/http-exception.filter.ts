import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { Logger } from 'nestjs-pino';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  private extractMessage(
    exceptionResponse: string | object | null,
    exception: unknown,
  ) {
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
    ) {
      return (exceptionResponse as { message: string | string[] }).message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const isHttpException = exception instanceof HttpException;

    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    const message = this.extractMessage(exceptionResponse, exception);

    const errorResponse = {
      success: false,
      statusCode,
      message,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    if (statusCode >= 500) {
      this.logger.error(
        {
          err: exception,
          path: request.url,
          method: request.method,
        },
        'Unhandled HTTP exception',
      );
    } else {
      this.logger.warn(
        {
          path: request.url,
          method: request.method,
          statusCode,
          message,
        },
        'Handled HTTP exception',
      );
    }

    response.status(statusCode).send(errorResponse);
  }
}
