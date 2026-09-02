import type { LoggerService, LogLevel } from '@nestjs/common';
import { currentCorrelationId } from '../correlation/correlation.context.js';

const ORDER: Record<string, number> = { debug: 10, log: 20, info: 20, warn: 30, error: 40 };

/**
 * Structured JSON logger.
 *
 * One JSON object per line, with the correlation id attached automatically from
 * the async context. JSON rather than pretty text because these lines are read
 * by a log aggregator far more often than by a human, and a human can still
 * pipe them through `jq`. Pretty-printing would make the aggregator's job
 * harder to make the rarer case marginally nicer.
 *
 * It writes to stdout and never to a file. The platform collects stdout; a
 * process writing its own log files on a PaaS instance produces logs that
 * vanish with the container.
 */
export class StructuredLogger implements LoggerService {
  constructor(
    private readonly service: string,
    private readonly minLevel: 'debug' | 'info' | 'warn' | 'error' = 'info',
  ) {}

  private emit(level: string, message: unknown, context?: unknown, stack?: unknown): void {
    if ((ORDER[level] ?? 20) < (ORDER[this.minLevel] ?? 20)) return;

    const line: Record<string, unknown> = {
      time: new Date().toISOString(),
      level: level === 'log' ? 'info' : level,
      service: this.service,
      message: typeof message === 'string' ? message : JSON.stringify(message),
    };

    const correlationId = currentCorrelationId();
    if (correlationId) line.correlationId = correlationId;
    if (typeof context === 'string' && context) line.context = context;
    if (stack) line.stack = String(stack);

    process.stdout.write(`${JSON.stringify(line)}\n`);
  }

  log(message: unknown, context?: unknown): void {
    this.emit('info', message, context);
  }
  error(message: unknown, stack?: unknown, context?: unknown): void {
    this.emit('error', message, context, stack);
  }
  warn(message: unknown, context?: unknown): void {
    this.emit('warn', message, context);
  }
  debug(message: unknown, context?: unknown): void {
    this.emit('debug', message, context);
  }
  verbose(message: unknown, context?: unknown): void {
    this.emit('debug', message, context);
  }
  setLogLevels?(_levels: LogLevel[]): void {
    // Levels are fixed from LOG_LEVEL at startup so that log volume is a
    // deployment decision rather than something code can quietly change.
  }
}
