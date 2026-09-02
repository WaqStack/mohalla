import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';
import type { Env } from '../config/env.js';
import { StructuredLogger } from '../common/logging/structured.logger.js';

/**
 * The single owner of the PostgreSQL connection pool.
 *
 * FOUNDATION ONLY. It exposes `query`, `withTransaction` and `ping` and nothing
 * product-specific. No repository, no entity, no table name appears here.
 *
 * `withTransaction` exists at the foundation layer on purpose: Stage 4 requires
 * the transaction boundary to be the application service, and several rules
 * depend on it - an admin action and its audit row must commit together, and
 * registration writes user, identifier, OTP and outbox atomically. Giving every
 * future service the same primitive is what makes that consistent rather than
 * re-invented per module.
 */
@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly pool: Pool;

  constructor(
    env: Env,
    private readonly logger: StructuredLogger,
  ) {
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: env.DATABASE_POOL_MAX,
      connectionTimeoutMillis: env.DATABASE_CONNECT_TIMEOUT_MS,
      application_name: 'mohalla-api',
    });

    // An idle-client error is emitted outside any request. Unhandled, it takes
    // the process down.
    this.pool.on('error', (err) => {
      this.logger.error(
        JSON.stringify({ event: 'pool_error' }),
        err.stack ?? err.message,
        'database',
      );
    });
  }

  async query<Row extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(sql, params as unknown[] | undefined);
  }

  /**
   * Runs `fn` inside a single transaction on a single client.
   *
   * Commits on return, rolls back on throw, and always releases the client -
   * a leaked client on the error path exhausts the pool and looks like a
   * database outage.
   */
  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // The connection is already broken; the original error is what matters.
      }
      throw e;
    } finally {
      client.release();
    }
  }

  /** Cheapest possible liveness probe for the readiness check. */
  async ping(): Promise<{ ok: boolean; detail: string }> {
    try {
      const r = await this.query<{ ok: number }>('select 1 as ok');
      return { ok: r.rows[0]?.ok === 1, detail: 'select 1 succeeded' };
    } catch (e) {
      // The message only. Never the connection string.
      return { ok: false, detail: e instanceof Error ? e.message : 'unknown error' };
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end().catch(() => undefined);
  }
}
