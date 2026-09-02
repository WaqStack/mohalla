import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped correlation context.
 *
 * `AsyncLocalStorage` is used rather than passing a correlation id through every
 * function signature. The id has to reach the logger, the error filter and
 * eventually the audit writer - threading it manually through all three would
 * mean every future service method grows a parameter that has nothing to do
 * with its job, and one missed hand-off silently breaks traceability.
 */
export interface CorrelationContext {
  correlationId: string;
}

const storage = new AsyncLocalStorage<CorrelationContext>();

export function runWithCorrelation<T>(ctx: CorrelationContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

/** Returns the active correlation id, or `undefined` outside a request. */
export function currentCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}
