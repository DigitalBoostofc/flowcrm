import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

/**
 * Catches every exception that escapes a controller. NestJS HttpExceptions
 * pass through unchanged; everything else is normalized to a generic 500 so
 * stack traces, TypeORM error messages, or Postgres details never reach the
 * client. Internal context still goes to the structured logger.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      res.status(status).json(typeof body === 'string' ? { statusCode: status, message: body } : body);
      return;
    }

    let logCategory = 'unknown';
    if (exception instanceof QueryFailedError) logCategory = 'db.query_failed';
    else if (exception instanceof EntityNotFoundError) logCategory = 'db.entity_not_found';
    else if (exception instanceof Error) logCategory = 'unhandled.' + exception.name;

    this.logger.error(
      {
        category: logCategory,
        path: req.url,
        method: req.method,
        message: (exception as Error)?.message,
        stack: (exception as Error)?.stack,
      },
      'Unhandled exception escaped controller',
    );

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
    });
  }
}
