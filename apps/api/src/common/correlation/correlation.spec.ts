import { describe, it, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { isValidCorrelationId } from '@mohalla/contracts';
import { CorrelationMiddleware } from './correlation.middleware.js';
import { currentCorrelationId, runWithCorrelation } from './correlation.context.js';
import { CORRELATION_HEADER } from '@mohalla/contracts';

type Req = { headers: Record<string, unknown>; correlationId?: string };
type Res = { headers: Record<string, string>; setHeader(k: string, v: string): void };

function fakes(headers: Record<string, unknown> = {}): { req: Req; res: Res } {
  const res: Res = {
    headers: {},
    setHeader(k, v) {
      this.headers[k] = v;
    },
  };
  return { req: { headers }, res };
}

describe('correlation context', () => {
  it('exposes the id inside the async scope and nothing outside it', () => {
    const id = randomUUID();
    runWithCorrelation({ correlationId: id }, () => {
      expect(currentCorrelationId()).toBe(id);
    });
    expect(currentCorrelationId()).toBeUndefined();
  });

  it('survives an await boundary', async () => {
    const id = randomUUID();
    await runWithCorrelation({ correlationId: id }, async () => {
      await new Promise((r) => setTimeout(r, 1));
      expect(currentCorrelationId()).toBe(id);
    });
  });
});

describe('CorrelationMiddleware', () => {
  const mw = new CorrelationMiddleware();

  it('generates a UUID when the client supplies none', () => {
    const { req, res } = fakes();
    mw.use(req as never, res as never, () => undefined);
    expect(isValidCorrelationId(res.headers[CORRELATION_HEADER])).toBe(true);
  });

  it('honours a valid client-supplied id so client and server traces join', () => {
    const id = randomUUID();
    const { req, res } = fakes({ [CORRELATION_HEADER]: id });
    mw.use(req as never, res as never, () => undefined);
    expect(res.headers[CORRELATION_HEADER]).toBe(id);
  });

  it.each([
    ['not-a-uuid'],
    ["'; DROP TABLE audit_log; --"],
    ['../../etc/passwd'],
    ['a'.repeat(500)],
  ])('replaces the invalid value %s instead of trusting it', (bad) => {
    const { req, res } = fakes({ [CORRELATION_HEADER]: bad });
    mw.use(req as never, res as never, () => undefined);
    const assigned = res.headers[CORRELATION_HEADER];
    expect(assigned).not.toBe(bad);
    expect(isValidCorrelationId(assigned)).toBe(true);
  });

  it('makes the id available to the handler chain', () => {
    const { req, res } = fakes();
    let seen: string | undefined;
    mw.use(req as never, res as never, () => {
      seen = currentCorrelationId();
    });
    expect(seen).toBe(res.headers[CORRELATION_HEADER]);
  });
});
