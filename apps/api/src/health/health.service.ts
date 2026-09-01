import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

export interface DependencyResult {
  name: string;
  ok: boolean;
  detail: string;
}

/**
 * Health checks for the foundation.
 *
 * Deliberately shallow: this reports whether the process is running and whether
 * its declared dependencies answer. It makes no product assertion, because no
 * product feature exists yet.
 */
@Injectable()
export class HealthService {
  constructor(private readonly pool: Pool) {}

  /** Liveness: the process is up. No dependency is consulted. */
  live(): { status: 'ok'; uptimeSeconds: number } {
    return { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) };
  }

  /** Readiness: every declared dependency answers. */
  async ready(): Promise<{ ok: boolean; dependencies: DependencyResult[] }> {
    const dependencies: DependencyResult[] = [await this.checkDatabase()];
    return { ok: dependencies.every((d) => d.ok), dependencies };
  }

  private async checkDatabase(): Promise<DependencyResult> {
    try {
      const r = await this.pool.query('select 1 as ok');
      return {
        name: 'postgres',
        ok: r.rows[0]?.ok === 1,
        detail: 'select 1 succeeded',
      };
    } catch (e) {
      // The message is returned, never the connection string.
      return {
        name: 'postgres',
        ok: false,
        detail: e instanceof Error ? e.message : 'unknown error',
      };
    }
  }
}
