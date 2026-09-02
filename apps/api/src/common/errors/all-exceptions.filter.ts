import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CORRELATION_HEADER, FoundationErrorCode, type ApiErrorResponse } from '@mohalla/contracts';
import { currentCorrelationId } from '../correlation/correlation.context.js';
import { StructuredLogger } from '../logging/structured.logger.js';

/**
 * Converts every thrown error into the single API error envelope.
 *
 * WHY A CATCH-ALL AND NOT PER-ROUTE HANDLING
 *
 * An unhandled error is exactly the case where a stack trace, a SQL fragment or
 * a connection string is most likely to reach the client. Catching everything
 * in one place means there is one implementation to review for that leak,
 * instead of one per controller with the newest one always the least careful.
 *
 * A 5xx returns a fixed generic message. The real detail is logged with the
 * correlation id, which is also returned - so a user can report "correlation
 * 3f2a..." and the exact failure is findable without ever having exposed it.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: StructuredLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') throw exception;

    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { correlationId?: string }>();

    const correlationId =
      currentCorrelationId() ??
      req.correlationId ??
      (res.getHeader(CORRELATION_HEADER) as string | undefined) ??
      'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: string = FoundationErrorCode.INTERNAL_ERROR;
    let message = 'An unexpected error occurred.';
    let details: ReadonlyArray<{ path: string; message: string }> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'object' && payload !== null) {
        const p = payload as Record<string, unknown>;
        if (typeof p.code === 'string') code = p.code;
        if (typeof p.message === 'string') message = p.message;
        if (Array.isArray(p.details)) {
          details = p.details as ReadonlyArray<{ path: string; message: string }>;
        }
      } else if (typeof payload === 'string') {
        message = payload;
      }

      if (code === FoundationErrorCode.INTERNAL_ERROR) {
        if (status === HttpStatus.NOT_FOUND) code = FoundationErrorCode.NOT_FOUND;
        else if (status === HttpStatus.SERVICE_UNAVAILABLE) {
          code = FoundationErrorCode.DEPENDENCY_UNAVAILABLE;
        } else if (status < 500) code = FoundationErrorCode.VALIDATION_FAILED;
      }
    }

    if (status >= 500) {
      this.logger.error(
        JSON.stringify({
          event: 'unhandled_error',
          path: (req.originalUrl ?? req.url ?? '').split('?')[0],
          status,
        }),
        exception instanceof Error ? exception.stack : String(exception),
        'exception',
      );
      // Overwrite whatever the exception said. Internal detail does not ship.
      message = 'An unexpected error occurred.';
      details = undefined;
    }

    const body: ApiErrorResponse = {
      error: {
        code,
        message,
        ...(details ? { details } : {}),
        correlationId,
        timestamp: new Date().toISOString(),
      },
    };

    res.status(status).json(body);
  }
}
