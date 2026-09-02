import { describe, it, expect } from 'vitest';
import { loadEnv } from './env.js';

const base = { DATABASE_URL: 'postgres://u:p@127.0.0.1:5432/db' };

describe('worker loadEnv', () => {
  it('refuses to start without DATABASE_URL', () => {
    expect(() => loadEnv({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL is required/);
  });

  it('defaults the retry policy rather than leaving jobs un-retried', () => {
    const env = loadEnv(base as NodeJS.ProcessEnv);
    expect(env.JOB_RETRY_LIMIT).toBe(3);
    expect(env.JOB_RETRY_DELAY_SECONDS).toBe(15);
    expect(env.JOB_EXPIRE_SECONDS).toBe(120);
    expect(env.WORKER_HEARTBEAT_SECONDS).toBe(60);
    expect(env.PGBOSS_SCHEMA).toBe('pgboss');
  });

  it('never echoes a configuration value in the error', () => {
    try {
      loadEnv({ ...base, JOB_RETRY_LIMIT: 'not-a-number-s3cret' } as NodeJS.ProcessEnv);
      throw new Error('expected throw');
    } catch (e) {
      expect((e as Error).message).not.toContain('not-a-number-s3cret');
    }
  });

  it('rejects an out-of-range retry limit', () => {
    expect(() => loadEnv({ ...base, JOB_RETRY_LIMIT: '999' } as NodeJS.ProcessEnv)).toThrow();
  });
});
