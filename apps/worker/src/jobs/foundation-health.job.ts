/**
 * FOUNDATION_HEALTH_JOB
 *
 * The single job the Stage 5 foundation ships. It exists to prove one path end
 * to end, before any product job is written:
 *
 *     enqueue  ->  pg-boss persists in PostgreSQL  ->  worker consumes
 *
 * If this completes, the queue path is real. If it does not, no product job
 * would have worked either - and this is far cheaper to debug.
 *
 * It performs no business work and touches no product table.
 */
export const FOUNDATION_HEALTH_JOB = 'foundation.health';

/**
 * Dead-letter queue for the foundation job.
 *
 * A job that exhausts its retries has its payload copied here rather than
 * vanishing. Without it, "the queue works" and "the queue accepted work and
 * silently lost it" look identical in the database.
 */
export const FOUNDATION_HEALTH_DEAD_LETTER = 'foundation.health.dead';

export interface FoundationHealthPayload {
  /** Set by the enqueuer so the round trip can be correlated in logs. */
  enqueuedAt: string;
  /** Free-text marker, used by the smoke test to identify its own job. */
  marker: string;
  /**
   * Correlation id carried from whoever enqueued the job.
   *
   * Jobs are the point where a request's trace would normally be lost - the
   * HTTP response has already been sent. Carrying the id in the payload is what
   * lets an admin action, the job it queued, and the resulting audit row all be
   * found together.
   */
  correlationId?: string;
  /**
   * When set, the handler throws. Used ONLY by the retry / dead-job
   * verification so that behaviour is proven rather than assumed.
   */
  failUntilAttempt?: number;
}

export interface FoundationHealthResult {
  marker: string;
  enqueuedAt: string;
  completedAt: string;
  latencyMs: number;
}

export function handleFoundationHealth(
  payload: FoundationHealthPayload,
  attempt: number,
): FoundationHealthResult {
  if (payload.failUntilAttempt !== undefined && attempt < payload.failUntilAttempt) {
    throw new Error(
      `foundation health job: deliberate failure on attempt ${attempt} ` +
        `(configured to succeed from attempt ${payload.failUntilAttempt})`,
    );
  }

  const completedAt = new Date();
  const enqueued = new Date(payload.enqueuedAt);
  return {
    marker: payload.marker,
    enqueuedAt: payload.enqueuedAt,
    completedAt: completedAt.toISOString(),
    latencyMs: completedAt.getTime() - enqueued.getTime(),
  };
}
