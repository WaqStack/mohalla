import { Injectable } from '@nestjs/common';
import type {
  DependencyResult,
  HealthSummaryResponse,
  LivenessResponse,
  ReadinessResponse,
} from '@mohalla/contracts';
import { DatabaseService } from '../database/database.service.js';
import type { Env } from '../config/env.js';

/**
 * Health checks for the foundation.
 *
 * Deliberately shallow: it reports whether the process is running and whether
 * its declared dependencies answer. It makes no product assertion, because no
 * product feature exists.
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly env: Env,
  ) {}

  /** Liveness: the process is up. No dependency is consulted. */
  live(): LivenessResponse {
    return { status: 'ok', uptimeSeconds: Math.floor(process.uptime()) };
  }

  /** Readiness: every declared dependency answers. */
  async ready(): Promise<ReadinessResponse> {
    const dependencies = await this.checkDependencies();
    return { ok: dependencies.every((d) => d.ok), dependencies };
  }

  /** Human-facing summary, including which artefact is running. */
  async summary(): Promise<HealthSummaryResponse> {
    const dependencies = await this.checkDependencies();
    return {
      status: dependencies.every((d) => d.ok) ? 'ok' : 'degraded',
      service: 'mohalla-api',
      version: this.env.APP_VERSION,
      commit: this.env.GIT_COMMIT,
      environment: this.env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      dependencies,
    };
  }

  private async checkDependencies(): Promise<DependencyResult[]> {
    const pg = await this.db.ping();
    return [{ name: 'postgres', ok: pg.ok, detail: pg.detail }];
  }
}
