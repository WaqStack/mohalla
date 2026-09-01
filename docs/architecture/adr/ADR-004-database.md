# ADR-004 — Primary database: PostgreSQL

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-09, D-10, D-11, D-12, D-15

## Context

One database must serve relational integrity, bilingual search including best-effort Roman Urdu (BR-042), an append-only audit log that cannot be deleted (BR-039, SEC-023), atomic report thresholds (SAFETY-FR-004), a job queue, and session storage — for a team with no DBA.

## Requirements

All data-bearing FRs · BR-030/032/039 · SEC-011/022/023/026 · SEARCH-FR-001/002/003 · NFR-PERF-002 · NFR-SCAL-001/002

## Options considered

**A — PostgreSQL.** Full-text search, `pg_trgm`, partial and expression indexes, JSONB, `CHECK`/`EXCLUDE` constraints, `SELECT … FOR UPDATE`, table-level privilege revocation, native `uuidv7()`, and a workable job queue.

**B — MySQL.** Widely available and well understood. Weaker full-text search, no trigram equivalent, weaker constraint expressiveness, weaker partial-index support.

## Decision

**PostgreSQL.** Major version is confirmed at EPIC-00 against the selected managed service (ADR-016).

Verified 1 September 2026: PostgreSQL provides built-in `uuidv7()` and `uuidv4()`, documented for PostgreSQL 18. **The architecture does not require version 18** — ADR-007 defines an application-generated fallback producing an identical identifier format, so the database version does not constrain hosting selection.

## Why

Four requirements are met by PostgreSQL features and would otherwise each require additional infrastructure:

1. **Search** — FTS plus `pg_trgm` removes the need for a search engine (ADR-011).
2. **Audit immutability** — `REVOKE UPDATE, DELETE` on the audit table enforces BR-039 **in the database**, not in application code. This is the single strongest argument, because SEC-023 says no route may edit or delete an entry, and application discipline is not a control.
3. **Threshold atomicity** — a unique `(reporter, target)` constraint plus row locking inside one transaction satisfies BR-030 and EDGE-023 without application-level coordination.
4. **Queue** — `pg-boss` provides transactional enqueue, so the outbox is written in the same transaction as the business change (ADR-010).

## Benefits
One engine to operate, back up and restore (SEC-026). Constraints carry business rules, supporting NFR-MAIN-002. Managed offerings are universal.

## Disadvantages
Single failure domain. Queue and search load sit on the primary. Trigram search will not match a dedicated engine's recall (RSK-012, accepted under BR-042).

## Security impact
Strongly positive — table-level privilege revocation is a real control, and parameterised queries via the ORM satisfy SEC-016.

## Privacy impact
Column-level classification and targeted erasure for PRIV-007 are straightforward.

## Operational impact
Managed PostgreSQL with daily automated backups and a tested restore before launch (SEC-026, REL-007).

## Cost impact
One managed instance. Storage growth monitored under NFR-SCAL-003.

## Revisit trigger
A measured workload requires a different engine. Minimum supported major version is set at EPIC-00; features used beyond that baseline must have a documented fallback, as UUIDv7 does (ADR-007).
