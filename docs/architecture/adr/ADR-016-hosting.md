# ADR-016 — Hosting: managed PaaS with managed PostgreSQL

**Status:** Accepted · **provider selection deferred to measurement**
**Date:** 1 September 2026
**Drivers:** D-15, NFR-AVAIL-001, NFR-PERF-002

## Context

Two developers who also write features. No DBA, no SRE, no Kubernetes specialist, no 24/7 rotation. Target 99% monthly uptime (NFR-AVAIL-001) — roughly 7 hours of permitted downtime per month, which is realistic without on-call. Read APIs target 800 ms p95 (NFR-PERF-002) for users across Pakistan.

## Decision

**Managed PaaS for compute, managed PostgreSQL, S3-compatible object storage, CDN.** No Kubernetes, no self-managed database, no self-managed VMs.

**The specific provider and region are deliberately not selected in this document.**

## Why the provider is deferred

Two facts must be measured first, and inventing them would be worse than deferring:

1. **Latency to Pakistan.** There is no major cloud region inside Pakistan. Candidate regions must be measured by real round-trip time from Pakistani mobile networks before selection, since NFR-PERF-002 depends on it.
2. **Data residency is unresolved.** OD-019 — whether PECA or PTA obligations constrain where user data may be stored — is a legal question that has not been answered. Selecting a region now risks a migration later.

The **architecture does not depend on which provider is chosen**: managed PaaS, managed PostgreSQL and S3-compatible storage are commodity capabilities. Deferring costs nothing and avoids an expensive reversal.

## Selection criteria — to apply at EPIC-00

| Criterion | Why |
|---|---|
| Measured RTT from major Pakistani networks | NFR-PERF-002 |
| Managed PostgreSQL at a version supporting the intended features | ADR-004, ADR-007 |
| Automated daily backups with point-in-time recovery and **a restore that can be tested** | SEC-026, REL-007 |
| Persistent connections for Socket.IO | ADR-009 |
| A long-running worker process, not just request handlers | ADR-010 |
| Secret management outside source control | SEC-025 |
| S3-compatible storage and a CDN, ideally same-provider | ADR-012 |
| Rollback to a previous release in one action | §30 |
| Cost predictability at NGO scale | Budget constraint |

## Topology

**Launch — 1,000 registered · 100 concurrent**
One API instance (REST + Socket.IO) · one worker instance · one managed PostgreSQL with daily backups · object storage + CDN · FCM · error tracking and uptime monitoring.

**Growth — 10,000 registered · 500 concurrent**
Vertical scale first — it is the cheapest change and requires no architectural work. Then, and only on a trigger:

| Trigger | Action | Consequence |
|---|---|---|
| API CPU sustained high | Scale up | None |
| **More than one API instance needed** | Add Redis for the Socket.IO adapter | **First introduction of Redis** (ADR-010) |
| Database CPU or connections saturated | Scale up; add a read replica for feed reads | Feed queries move to the replica |
| Queue depth sustained | Second worker instance | None — `pg-boss` supports it |
| Storage growth | Lifecycle policies; review retention | Cost control (RSK-013) |

## Benefits
No infrastructure specialism required; backups and failover are the provider's problem; a two-person team can operate it.

## Disadvantages
Less control; provider ceilings; some lock-in at the PaaS layer — mitigated by keeping the application a standard Node process and storage S3-compatible.

## Security impact
Managed TLS, managed database patching and provider secret storage remove three classes of mistake a small team would otherwise make.

## Privacy impact
**Region choice is a privacy decision pending OD-019.**

## Cost impact
Drivers, in likely order: object storage egress · database · compute · SMS/OTP. Bands only, no quotation.

## Revisit trigger
Cost or capability ceiling; or OD-019 imposing a residency constraint the provider cannot meet.
