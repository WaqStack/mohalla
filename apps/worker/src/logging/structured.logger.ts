const ORDER: Record<string, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Structured JSON logger for the worker.
 *
 * Deliberately a small local copy rather than an import from the API: the
 * worker is a separate deployable that must not depend on the API's internals,
 * and extracting a shared logging package for ~40 lines would add a package
 * boundary that buys nothing. If a third consumer appears, it gets extracted.
 *
 * `correlationId` is passed explicitly rather than read from async context,
 * because a job's correlation id comes from the payload of whoever enqueued it -
 * it is data, not ambient request state.
 */
export class StructuredLogger {
  constructor(
    private readonly service: string,
    private readonly minLevel: 'debug' | 'info' | 'warn' | 'error' = 'info',
  ) {}

  private emit(level: string, fields: Record<string, unknown>): void {
    if ((ORDER[level] ?? 20) < (ORDER[this.minLevel] ?? 20)) return;
    process.stdout.write(
      `${JSON.stringify({
        time: new Date().toISOString(),
        level,
        service: this.service,
        ...fields,
      })}\n`,
    );
  }

  debug(fields: Record<string, unknown>): void {
    this.emit('debug', fields);
  }
  info(fields: Record<string, unknown>): void {
    this.emit('info', fields);
  }
  warn(fields: Record<string, unknown>): void {
    this.emit('warn', fields);
  }
  error(fields: Record<string, unknown>): void {
    this.emit('error', fields);
  }
}
