import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';

interface ErrorResponseBody {
  success: false;
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
  error: string;
}

const PRISMA_ERROR_STATUS: Record<string, number> = {
  P2002: HttpStatus.CONFLICT,
  P2003: HttpStatus.BAD_REQUEST,
  P2025: HttpStatus.NOT_FOUND,
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message, error } = this.resolveError(exception);

    const body: ErrorResponseBody = {
      success: false,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
      error,
    };

    this.logger.error(
      `${request.method} ${request.url} -> ${statusCode}: ${JSON.stringify(message)}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(statusCode).json(body);
  }

  private resolveError(exception: unknown): {
    statusCode: number;
    message: string | string[];
    error: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === 'string'
          ? payload
          : ((payload as { message?: string | string[] }).message ??
            exception.message);
      return { statusCode: status, message, error: exception.name };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const statusCode =
        PRISMA_ERROR_STATUS[exception.code] ?? HttpStatus.BAD_REQUEST;
      return {
        statusCode,
        message: `Database request failed (${exception.code})`,
        error: 'PrismaClientKnownRequestError',
      };
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid database query',
        error: 'PrismaClientValidationError',
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: exception instanceof Error ? exception.name : 'UnknownError',
    };
  }
}
