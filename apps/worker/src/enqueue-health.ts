import { PgBoss } from 'pg-boss';
import { loadEnv } from './config/env.js';
import {
  FOUNDATION_HEALTH_JOB,
  type FoundationHealthPayload,
} from './jobs/foundation-health.job.js';

/**
 * Enqueues one FOUNDATION_HEALTH_JOB and exits.
 *
 * Used by the foundation smoke test to drive the queue round trip without
 * needing the API to expose a job-enqueue route (it must not - the foundation
 * exposes health endpoints only).
 */
async function main(): Promise<void> {
  const env = loadEnv();
  const boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: env.PGBOSS_SCHEMA });
  await boss.start();
  await boss.createQueue(FOUNDATION_HEALTH_JOB);

  const marker = process.argv[2] ?? `smoke-${process.pid}`;
  const payload: FoundationHealthPayload = {
    enqueuedAt: new Date().toISOString(),
    marker,
  };

  const id = await boss.send(FOUNDATION_HEALTH_JOB, payload);
  console.log(JSON.stringify({ enqueued: true, jobId: id, marker }));

  await boss.stop({ graceful: true });
}

void main();
