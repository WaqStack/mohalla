import { PgBoss } from 'pg-boss';
import { randomUUID } from 'node:crypto';
import { loadEnv } from './config/env.js';
import {
  FOUNDATION_HEALTH_DEAD_LETTER,
  FOUNDATION_HEALTH_JOB,
  type FoundationHealthPayload,
} from './jobs/foundation-health.job.js';

/**
 * Enqueues one FOUNDATION_HEALTH_JOB and exits.
 *
 * Used by the foundation smoke test to drive the queue round trip without the
 * API exposing a job-enqueue route - it must not; the foundation exposes health
 * endpoints only.
 *
 * Usage: node dist/enqueue-health.js [marker] [failUntilAttempt]
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema: env.PGBOSS_SCHEMA,
    application_name: 'mohalla-enqueue',
  });

  await boss.start();
  await boss.createQueue(FOUNDATION_HEALTH_DEAD_LETTER);
  await boss.createQueue(FOUNDATION_HEALTH_JOB, {
    retryLimit: env.JOB_RETRY_LIMIT,
    retryDelay: env.JOB_RETRY_DELAY_SECONDS,
    retryBackoff: true,
    expireInSeconds: env.JOB_EXPIRE_SECONDS,
    deadLetter: FOUNDATION_HEALTH_DEAD_LETTER,
  });

  const marker = process.argv[2] ?? `smoke-${process.pid}`;
  const failUntil = process.argv[3] ? Number(process.argv[3]) : undefined;

  const payload: FoundationHealthPayload = {
    enqueuedAt: new Date().toISOString(),
    marker,
    correlationId: randomUUID(),
    ...(failUntil !== undefined ? { failUntilAttempt: failUntil } : {}),
  };

  const id = await boss.send(FOUNDATION_HEALTH_JOB, payload);
  process.stdout.write(
    `${JSON.stringify({ enqueued: true, jobId: id, marker, correlationId: payload.correlationId })}\n`,
  );

  await boss.stop({ graceful: true, close: true });
}

void main();
