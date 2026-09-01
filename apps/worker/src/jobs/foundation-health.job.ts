/**
 * FOUNDATION_HEALTH_JOB
 *
 * The single job the Stage 5 foundation ships. It exists to prove one thing
 * end to end, before any product job is written:
 *
 *     API/CLI enqueues  ->  pg-boss persists in PostgreSQL  ->  worker consumes
 *
 * If this job completes, the queue path is real. If it does not, no product job
 * would have worked either - and this is far cheaper to debug.
 *
 * It performs no business work and touches no product table.
 */
export const FOUNDATION_HEALTH_JOB = 'foundation.health';

export interface FoundationHealthPayload {
  /** Set by the enqueuer so the round trip can be correlated in logs. */
  enqueuedAt: string;
  /** Free-text marker, used by the smoke test to identify its own job. */
  marker: string;
}

export interface FoundationHealthResult {
  marker: string;
  enqueuedAt: string;
  completedAt: string;
  latencyMs: number;
}

export function handleFoundationHealth(payload: FoundationHealthPayload): FoundationHealthResult {
  const completedAt = new Date();
  const enqueued = new Date(payload.enqueuedAt);
  return {
    marker: payload.marker,
    enqueuedAt: payload.enqueuedAt,
    completedAt: completedAt.toISOString(),
    latencyMs: completedAt.getTime() - enqueued.getTime(),
  };
}
