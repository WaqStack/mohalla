# ADR-010 — Background jobs: pg-boss. No Redis in V1.

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-15

## Context

Version 1 asynchronous work:

| Job | Requirement | Cadence |
|---|---|---|
| Outbox dispatch to notifications | NOTIF-FR-003 | Continuous, low volume |
| Push fan-out to FCM | NOTIF-FR-001 | Continuous, low volume |
| Event reminders, 24 h and 1 h | EVENT-FR-008, NOTIF-FR-006 | Scheduled |
| Suspension expiry | BR-034, EDGE-028 | Scheduled |
| Account erasure at day 30 | PRIV-007, SET-FR-004 | Daily |
| Media quarantine validation | SEC-013, ADR-013 | On upload |
| Orphan media sweep | §21 | Daily |
| Announcement expiry | FEED-FR-002 | Daily |
| Session pruning | ADR-008 | Daily |
| Notification retention, 90 days | NOTIF-FR-002 | Daily |

All of it is low-volume and mostly schedule-driven.

## Options considered

**A — Redis + BullMQ.** The conventional choice. Adds a service to provision, secure, back up and monitor.

**B — `pg-boss` on the existing PostgreSQL.** Transactional enqueue; no new infrastructure.

**C — In-process timers.** No durability; jobs lost on restart. Unacceptable for erasure and suspension expiry.

## Decision

**`pg-boss` on PostgreSQL. Redis is not introduced in V1.**

## Why

**Transactional enqueue is the deciding technical argument, not merely simplicity.** The notification outbox must be written in the **same transaction** as the business change that caused it — otherwise a crash between commit and enqueue silently loses a notification. With `pg-boss` that is one transaction. With Redis it is a distributed-commit problem, solved by writing an outbox row to PostgreSQL anyway and having a worker relay it — at which point Redis is an extra hop, not a solution.

Redis would also be a service the team must secure, monitor and back up, against an explicit constraint that the architecture must not require specialist operations.

## Explicit triggers for adding Redis

Any one is sufficient. Recorded so the decision is revisited on evidence, not on habit:

1. **A realtime scaling trigger in ADR-009 fires** — sustained peak > 350 concurrent connections, event-loop lag > 100 ms p95, delivery latency > 3 s p95, or an availability requirement needing multi-instance deployment. Socket.IO then requires a shared pub/sub adapter, and that is the first legitimate reason for Redis
2. **Measured rate-limit contention** — SEC-005 counter writes contributing > 10% of database write load
3. **Measured queue contention** — `pg-boss` job start latency > 60 s at p95 for a sustained week

## Benefits
No new infrastructure; transactional enqueue; jobs survive restart; scheduling, retries and dead-lettering included; one backup covers data and queue.

## Disadvantages
Lower throughput ceiling than Redis — far above V1 need. Queue load sits on the primary database, so queue growth is a monitored metric (§33). Less tooling than BullMQ.

## Security impact
Positive — one fewer network service and one fewer credential (SEC-025).

## Privacy impact
Job payloads carry identifiers, never message bodies or personal data (PRIV-010).

## Operational impact
Worker runs as a second process from the same codebase. Dead-letter depth is alerted.

## Cost impact
Zero additional infrastructure.

## Revisit trigger
The three triggers above.
