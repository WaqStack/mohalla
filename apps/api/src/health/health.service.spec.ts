import { describe, it, expect } from 'vitest';
import { HealthService } from './health.service.js';
import type { DatabaseService } from '../database/database.service.js';
import type { Env } from '../config/env.js';

/**
 * Constructed directly rather than through the Nest DI container.
 *
 * The container resolves constructor dependencies from `emitDecoratorMetadata`,
 * which the test transformer does not emit. Building the object by hand tests
 * the same logic without depending on the framework's reflection - and it is
 * the reason every provider in this application is registered with an explicit
 * `useFactory` and `inject` list rather than implicit metadata.
 */
const env = {
  NODE_ENV: 'test',
  APP_VERSION: '1.2.3',
  GIT_COMMIT: 'abc1234',
} as unknown as Env;

function dbReturning(ok: boolean, detail: string): DatabaseService {
  return { ping: async () => ({ ok, detail }) } as unknown as DatabaseService;
}

describe('HealthService.live', () => {
  it('reports ok without consulting any dependency', () => {
    // A database that would throw if touched.
    const db = {
      ping: () => {
        throw new Error('liveness must not touch the database');
      },
    } as unknown as DatabaseService;

    const result = new HealthService(db, env).live();
    expect(result.status).toBe('ok');
    expect(result.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});

describe('HealthService.ready', () => {
  it('is ok when postgres answers', async () => {
    const r = await new HealthService(dbReturning(true, 'select 1 succeeded'), env).ready();
    expect(r.ok).toBe(true);
    expect(r.dependencies).toHaveLength(1);
    expect(r.dependencies[0]?.name).toBe('postgres');
  });

  it('is not ok when postgres does not answer', async () => {
    const r = await new HealthService(dbReturning(false, 'ECONNREFUSED'), env).ready();
    expect(r.ok).toBe(false);
    expect(r.dependencies[0]?.ok).toBe(false);
  });
});

describe('HealthService.summary', () => {
  it('reports the artefact identity so a running instance is identifiable', async () => {
    const s = await new HealthService(dbReturning(true, 'ok'), env).summary();
    expect(s.status).toBe('ok');
    expect(s.service).toBe('mohalla-api');
    expect(s.version).toBe('1.2.3');
    expect(s.commit).toBe('abc1234');
    expect(s.environment).toBe('test');
  });

  it('is degraded rather than throwing when a dependency is down', async () => {
    const s = await new HealthService(dbReturning(false, 'down'), env).summary();
    expect(s.status).toBe('degraded');
  });
});
