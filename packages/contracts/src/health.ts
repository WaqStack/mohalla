/**
 * Health payloads.
 *
 * PROPOSED DEFAULT (Stage 5). Stage 4 requires health checks as a deployment
 * mechanism but does not specify their paths or payloads.
 */

export interface LivenessResponse {
  status: 'ok';
  uptimeSeconds: number;
}

export interface DependencyResult {
  name: string;
  ok: boolean;
  detail: string;
}

export interface ReadinessResponse {
  ok: boolean;
  dependencies: DependencyResult[];
}

/** `GET /health` — the human-facing summary. */
export interface HealthSummaryResponse {
  status: 'ok' | 'degraded';
  service: string;
  /** Semantic version from package.json. */
  version: string;
  /** Git commit the artefact was built from. `unknown` when not injected. */
  commit: string;
  environment: string;
  uptimeSeconds: number;
  dependencies: DependencyResult[];
}
