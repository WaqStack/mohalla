# ADR-005 — Architecture style: modular monolith

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-15

## Context

Two developers, roughly 90 developer-days, an NGO budget, no DBA, no SRE, no Kubernetes specialist, no 24/7 rotation. Target scale is 1,000 registered and 100 concurrent at launch, growing to 10,000 and 500 without redesign (NFR-SCAL-001/002). Uptime target is 99% monthly (NFR-AVAIL-001).

## Requirements

NFR-SCAL-001/002 · NFR-AVAIL-001 · NFR-MAIN-001/002/003 · all 15 modules

## Options considered

**A — Modular monolith.** One deployable, fifteen enforced internal modules, one database.

**B — Microservices.** Independent services per bounded context.

**C — Serverless functions.** Per-endpoint functions.

## Decision

**Modular monolith**, one API process plus one worker process from the same codebase.

## Why

Microservices solve organisational scaling — independent teams shipping independently. **There is one team of two.** They would add network partitions, distributed transactions, service discovery, per-service deployment and distributed tracing, all in exchange for a benefit this project cannot use. The atomic requirements make it actively harmful: SAFETY-FR-004's threshold check must be transactional with the report insert, and the outbox must be transactional with the business change. Across services those become distributed-transaction problems.

Serverless was rejected on cold starts against NFR-PERF-002, and because Socket.IO requires persistent connections.

## Benefits
One deployment, one log stream, one database transaction boundary. Refactoring across modules is a compiler-checked operation. Local development is a single process.

## Disadvantages
A bad deploy affects everything — mitigated by health checks, rollback (§30) and staging. Modules can erode without enforcement — mitigated by NestJS imports (ADR-003) and an architecture-conformance review gate. Scaling is whole-process, which is acceptable at this scale.

## Security impact
Neutral. A single process means one attack surface to harden — for a two-person team, fewer surfaces is better.

## Privacy impact
Positive. One place to enforce public projections; no inter-service payloads carrying personal data.

## Operational impact
Minimal, which is the point.

## Cost impact
Lowest of the three.

## Revisit trigger
**Team boundaries, not load.** Extraction is justified when more than one team owns delivery, or when one module's resource profile genuinely diverges — media processing is the likeliest first candidate. Module boundaries are drawn so extraction is possible; it is not pre-built.
