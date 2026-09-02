import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';
import { StructuredLogger } from './structured.logger.js';

/**
 * Logs one line per completed request: method, route, status, duration.
 *
 * The URL is logged WITHOUT its query string. Query strings are where
 * identifiers and tokens end up, and Stage 4's privacy rules forbid personal
 * data in URLs - so logging the raw URL would defeat that rule at the logging
 * layer even when the application respected it everywhere else.
 */
@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: StructuredLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): ReturnType<CallHandler['handle']> {
    if (context.getType() !== 'http') return next.handle();

    const started = process.hrtime.bigint();
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const method = req.method;
    const path = (req.originalUrl ?? req.url ?? '').split('?')[0];

    const finish = (): void => {
      const durationMs = Number(process.hrtime.bigint() - started) / 1_000_000;
      this.logger.log(
        JSON.stringify({
          event: 'http_request',
          method,
          path,
          status: res.statusCode,
          durationMs: Math.round(durationMs * 100) / 100,
        }),
        'http',
      );
    };

    return next.handle().pipe(tap({ next: finish, error: finish }));
  }
}
