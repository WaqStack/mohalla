'use client';

import { useCallback, useEffect, useState } from 'react';
import type { HealthSummaryResponse } from '@mohalla/contracts';
import { ApiError, fetchHealth } from '../lib/api-client';

type Status =
  | { kind: 'loading' }
  | { kind: 'ok'; health: HealthSummaryResponse }
  | { kind: 'error'; message: string; correlationId?: string };

/**
 * Live API health, fetched from the browser.
 *
 * This is the Admin -> API leg of the foundation smoke chain. It runs
 * client-side deliberately: a server-rendered check would prove the Next.js
 * server can reach the API, not that a moderator's browser can — and CORS,
 * which only affects the browser, is exactly what tends to be misconfigured.
 */
export function HealthPanel() {
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  const load = useCallback(async () => {
    setStatus({ kind: 'loading' });
    try {
      setStatus({ kind: 'ok', health: await fetchHealth() });
    } catch (e) {
      if (e instanceof ApiError) {
        setStatus({ kind: 'error', message: e.message, correlationId: e.correlationId });
      } else {
        setStatus({
          kind: 'error',
          message: e instanceof Error ? e.message : 'Unknown error',
        });
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="card">
      <strong>API health</strong>

      {status.kind === 'loading' && <p className="muted">Checking…</p>}

      {status.kind === 'error' && (
        <>
          <p className="muted">
            Could not reach the API. This is expected when the API is not running.
          </p>
          <p className="mono">{status.message}</p>
          {status.correlationId && (
            <p className="mono muted">correlation: {status.correlationId}</p>
          )}
        </>
      )}

      {status.kind === 'ok' && (
        <dl className="kv">
          <dt>status</dt>
          <dd>{status.health.status}</dd>
          <dt>service</dt>
          <dd>{status.health.service}</dd>
          <dt>version</dt>
          <dd className="mono">{status.health.version}</dd>
          <dt>commit</dt>
          <dd className="mono">{status.health.commit}</dd>
          <dt>environment</dt>
          <dd>{status.health.environment}</dd>
          {status.health.dependencies.map((d) => (
            <>
              <dt key={`${d.name}-k`}>{d.name}</dt>
              <dd key={`${d.name}-v`}>{d.ok ? 'ok' : `unavailable — ${d.detail}`}</dd>
            </>
          ))}
        </dl>
      )}

      <button type="button" onClick={() => void load()}>
        Re-check
      </button>
    </div>
  );
}
