import {
  CORRELATION_HEADER,
  type ApiErrorResponse,
  type HealthSummaryResponse,
} from '@mohalla/contracts';
import { adminEnv } from './env';

/**
 * The admin console's only route to the API.
 *
 * STAGE 5 FOUNDATION. It can call the health endpoints and nothing else,
 * because nothing else exists. Product calls are added by their own epics.
 *
 * Every request carries a correlation id, so a failure a user reports in the
 * admin console can be found in the API logs.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly correlationId: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function newCorrelationId(): string {
  // `crypto.randomUUID` is a Web Crypto API present in both the browser and
  // Node 24's global scope, so no Node-only import is needed - which matters
  // because this module is bundled into the browser and a `node:crypto` import
  // would break that bundle.
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  const id = g.crypto?.randomUUID?.();
  if (id) return id;
  // Deterministic last resort if Web Crypto is somehow absent.
  return `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0').slice(-12)}`;
}

export interface RequestOptions {
  /** Milliseconds before the request is abandoned. */
  timeoutMs?: number;
  signal?: AbortSignal;
}

export function buildUrl(path: string, base: string = adminEnv.NEXT_PUBLIC_API_BASE_URL): string {
  // Normalise so `health` and `/health` behave identically and a double slash
  // can never reach the server.
  return `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const correlationId = newCorrelationId();
  const timeoutMs = options.timeoutMs ?? 5_000;

  // A console page that hangs forever on a wedged API is worse than one that
  // reports a timeout, so every request is bounded.
  const timeout = AbortSignal.timeout(timeoutMs);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  const res = await fetch(buildUrl(path), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      [CORRELATION_HEADER]: correlationId,
    },
    signal,
    cache: 'no-store',
  });

  const text = await res.text();

  if (!res.ok) {
    let code = 'UNKNOWN';
    let message = `Request failed with status ${res.status}`;
    try {
      const body = JSON.parse(text) as ApiErrorResponse;
      if (body.error) {
        code = body.error.code;
        message = body.error.message;
      }
    } catch {
      // Not the error envelope - a proxy or load balancer answered instead.
      // Keep the status-based message rather than surfacing raw HTML.
    }
    throw new ApiError(
      res.status,
      code,
      message,
      res.headers.get(CORRELATION_HEADER) ?? correlationId,
    );
  }

  return JSON.parse(text) as T;
}

/** `GET /health` — the only call the foundation makes. */
export function fetchHealth(options?: RequestOptions): Promise<HealthSummaryResponse> {
  return request<HealthSummaryResponse>('/health', options);
}
