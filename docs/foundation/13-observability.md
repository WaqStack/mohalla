# 13 — Health and Observability

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Status: **foundation only** — health endpoints and structured startup logging

---

## 1. Health endpoints

🟨 **PROPOSED DEFAULT.** Stage 4 requires health checks as a deployment mechanism (§14, ADR-005) but specifies neither paths nor payloads. This shape is a Stage 5 default, recorded as such, and changeable without affecting any approved requirement.

| Route | Consults dependencies | Purpose |
|---|---|---|
| `GET /health/live` | **No** | Is the process wedged? |
| `GET /health/ready` | **Yes** | Should traffic come here? `503` when not |

**Why the separation matters.** A liveness probe that touches the database restarts a healthy process whenever the database blips, turning a brief dependency outage into a full availability incident. This is the single most common self-inflicted outage in a small deployment, and separating the two probes is what prevents it.

`/health/ready` returns the driver's error message on failure and **never the connection string** — health endpoints are routinely exposed more widely than intended.

---

## 2. What is deliberately NOT built

| Not built | Why |
|---|---|
| Metrics endpoint / Prometheus | No product traffic exists to measure. NFR targets (800 ms p95 feed) are meaningless before a feed exists |
| Distributed tracing | One process. Tracing solves a problem the modular monolith was chosen to avoid |
| Log aggregation | Provider-dependent, and no provider is selected — **OD-019** |
| Alerting / on-call | **OD-020** — there is nobody to alert |
| Error tracking (Sentry etc.) | A real choice with a real cost, made when there is something to track |

Building any of these now would mean configuring against a provider that has not been chosen, for a service that does not exist, to alert a person who has not been named.

---

## 3. What exists

**Correlation IDs** are in the architecture (`audit_log.correlation_id` exists) but no request-scoped propagation is implemented — there are no requests to correlate.

**Structured startup logging.** Both processes log what they are and what they are not:

```
[api] foundation listening on :3000 (development) - health endpoints only
[worker] foundation running (development) - handler registered: foundation.health
```

**Graceful shutdown.** `app.enableShutdownHooks()` in the API; `SIGTERM`/`SIGINT` handlers calling `boss.stop({ graceful: true })` in the worker. This is foundation work rather than deferred work because the deployment strategy is **rolling restart** (Stage 4 §14) — a worker that does not drain on `SIGTERM` loses in-flight jobs on every single deploy.

---

## 4. The queue round trip is the real observability test

`FOUNDATION_HEALTH_JOB` exists to prove one path end to end before any product job depends on it:

```
enqueue  →  pg-boss persists in PostgreSQL  →  worker consumes  →  completed
```

`scripts/posix/foundation-smoke-test.mjs` drives it and then queries `pgboss.job` for the terminal state.

**Status: BLOCKED, not passing.** It requires a running PostgreSQL, which this workstation cannot provide — see [`09-local-development.md`](09-local-development.md).

The smoke test distinguishes three outcomes — **PASS**, **FAIL**, and **BLOCKED** — and exits `2` on blocked. A step that could not run is never silently skipped and never reported as a pass.
