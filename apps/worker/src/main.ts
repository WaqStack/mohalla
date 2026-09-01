import { PgBoss, type Job } from 'pg-boss';
import { loadEnv } from './config/env.js';
import {
  FOUNDATION_HEALTH_JOB,
  handleFoundationHealth,
  type FoundationHealthPayload,
} from './jobs/foundation-health.job.js';

/**
 * Worker entry point.
 *
 * STAGE 5 FOUNDATION. Registers exactly one job handler -
 * FOUNDATION_HEALTH_JOB - and no product jobs.
 */
async function main(): Promise<void> {
  const env = loadEnv();

  const boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema: env.PGBOSS_SCHEMA,
  });

  boss.on('error', (err: Error) => {
    console.error('[worker] pg-boss error:', err.message);
  });

  await boss.start();

  await boss.createQueue(FOUNDATION_HEALTH_JOB);

  await boss.work<FoundationHealthPayload>(
    FOUNDATION_HEALTH_JOB,
    async ([job]: Job<FoundationHealthPayload>[]) => {
      if (!job) return;
      const result = handleFoundationHealth(job.data);
      console.log(`[worker] ${FOUNDATION_HEALTH_JOB} completed`, JSON.stringify(result));
    },
  );

  console.log(
    `[worker] foundation running (${env.NODE_ENV}) - handler registered: ${FOUNDATION_HEALTH_JOB}`,
  );

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`[worker] ${signal} received, stopping gracefully`);
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void main();
