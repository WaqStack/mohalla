import { describe, it, expect } from 'vitest';
import { handleFoundationHealth, type FoundationHealthPayload } from './foundation-health.job.js';

function payload(over: Partial<FoundationHealthPayload> = {}): FoundationHealthPayload {
  return { enqueuedAt: new Date(Date.now() - 250).toISOString(), marker: 'unit', ...over };
}

describe('handleFoundationHealth', () => {
  it('completes and reports the enqueue-to-complete latency', () => {
    const r = handleFoundationHealth(payload(), 1);
    expect(r.marker).toBe('unit');
    expect(r.latencyMs).toBeGreaterThanOrEqual(0);
    expect(new Date(r.completedAt).toString()).not.toBe('Invalid Date');
  });

  it('throws while the attempt is below failUntilAttempt, so retries are exercisable', () => {
    const p = payload({ failUntilAttempt: 3 });
    expect(() => handleFoundationHealth(p, 1)).toThrow();
    expect(() => handleFoundationHealth(p, 2)).toThrow();
  });

  it('succeeds once the configured attempt is reached', () => {
    const p = payload({ failUntilAttempt: 3 });
    expect(handleFoundationHealth(p, 3).marker).toBe('unit');
  });

  it('carries the correlation id through untouched', () => {
    const p = payload({ correlationId: 'c0ffee' });
    expect(p.correlationId).toBe('c0ffee');
    expect(() => handleFoundationHealth(p, 1)).not.toThrow();
  });
});
