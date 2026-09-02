import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { CORRELATION_HEADER, isValidCorrelationId } from '@mohalla/contracts';
import { runWithCorrelation } from './correlation.context.js';

/**
 * Assigns a correlation id to every request and echoes it on the response.
 *
 * A client-supplied id is honoured ONLY if it is a valid UUID. That check is
 * deliberate: the id is written into logs and, later, into `audit_log`, so an
 * unvalidated client string would be an injection vector into the audit trail
 * and a way to poison log searches. An invalid value is replaced silently rather
 * than rejected - the request itself is not at fault.
 */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const supplied = req.headers[CORRELATION_HEADER];
    const candidate = Array.isArray(supplied) ? supplied[0] : supplied;

    const correlationId = isValidCorrelationId(candidate) ? candidate : randomUUID();

    res.setHeader(CORRELATION_HEADER, correlationId);
    // Kept on the request too, so the exception filter can read it even if the
    // async context has been lost by a badly-behaved library.
    (req as Request & { correlationId?: string }).correlationId = correlationId;

    runWithCorrelation({ correlationId }, () => next());
  }
}
