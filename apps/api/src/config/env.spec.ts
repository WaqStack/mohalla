import { describe, it, expect } from 'vitest';
import { loadEnv } from './env.js';

const base = { DATABASE_URL: 'postgres://u:p@127.0.0.1:5432/db' };

describe('loadEnv', () => {
  it('refuses to start without DATABASE_URL', () => {
    expect(() => loadEnv({} as NodeJS.ProcessEnv)).toThrow(/DATABASE_URL is required/);
  });

  it('never includes a configuration VALUE in the error message', () => {
    // A malformed but secret-looking value must not be echoed - startup errors
    // are logged, and logs are retained.
    try {
      loadEnv({ ...base, PORT: 'sup3r-s3cret-not-a-port' } as NodeJS.ProcessEnv);
      throw new Error('expected loadEnv to throw');
    } catch (e) {
      const message = (e as Error).message;
      expect(message).toContain('PORT');
      expect(message).not.toContain('sup3r-s3cret-not-a-port');
    }
  });

  it('applies documented defaults', () => {
    const env = loadEnv(base as NodeJS.ProcessEnv);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.SOCKET_IO_PATH).toBe('/realtime');
  });

  it('defaults CORS to an EMPTY allow-list, never a wildcard', () => {
    expect(loadEnv(base as NodeJS.ProcessEnv).CORS_ALLOWED_ORIGINS).toEqual([]);
  });

  it('parses and trims a comma-separated CORS list', () => {
    const env = loadEnv({
      ...base,
      CORS_ALLOWED_ORIGINS: 'https://admin.example.org , https://a.example.org',
    } as NodeJS.ProcessEnv);
    expect(env.CORS_ALLOWED_ORIGINS).toEqual([
      'https://admin.example.org',
      'https://a.example.org',
    ]);
  });

  it('rejects a port outside the valid range', () => {
    expect(() => loadEnv({ ...base, PORT: '99999' } as NodeJS.ProcessEnv)).toThrow();
  });

  it('rejects an unknown NODE_ENV rather than guessing', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'prod' } as NodeJS.ProcessEnv)).toThrow();
  });
});
