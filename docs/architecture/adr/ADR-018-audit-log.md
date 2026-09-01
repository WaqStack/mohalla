# ADR-018 — Audit log: database-enforced append-only

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-12

## Context

BR-039: *"The audit log is append-only. No interface, permission or administrator can edit or delete an entry."* SEC-023 restates it: the log cannot be edited or deleted **through any interface, permission or administrative route**. ADMIN-FR-012 makes it searchable by administrator, action and date range, and requires **sensitive-data views** — phone, email, date of birth, and reported conversations — to be logged as well as enforcement actions (SEC-022, PRIV-008, PRIV-009).

BR-038 requires a reason on every enforcement action.

## Decision

**Append-only, and protected from mutation by application and administrator roles, using database privileges rather than application code.**

### Role model

| Role | Used by | `audit_log` privileges |
|---|---|---|
| `migration_owner` | Migrations only, in CI/CD | Owns the table. `ALL` |
| `runtime_app` | API process | `INSERT`, `SELECT` — **no `UPDATE`, `DELETE`, `TRUNCATE`** |
| `runtime_worker` | Worker process | `INSERT`, `SELECT` — same restriction |
| `read_only_support` | Ad-hoc diagnosis | `SELECT` only, on non-sensitive tables |

**The table is owned by `migration_owner`, a role the runtime never connects as.** Production runtime connects only as `runtime_app` or `runtime_worker`; the migration role's credential exists solely in the deployment pipeline.

```sql
ALTER TABLE audit_log OWNER TO migration_owner;
REVOKE ALL       ON audit_log FROM PUBLIC;
GRANT  SELECT, INSERT ON audit_log TO runtime_app, runtime_worker;
-- UPDATE, DELETE and TRUNCATE are never granted to a runtime role.
```

Additional guarantees:
- **The Admin Portal exposes no audit mutation API** — `ADM-API-017` is `GET` only; there is no `PATCH` or `DELETE` route to omit.
- **The ORM repository for `audit_log` exposes `append()` and `query()` only.** No update or delete method exists to be called.
- **CI asserts the runtime grants** on every deploy: a failing check blocks the release if a migration ever restores `UPDATE` or `DELETE`.
- **Backup and restore preserve audit history** — the audit table is never excluded from a backup, and restore rehearsals verify its row count (SEC-026, REL-007).

## Why this rather than application discipline

SEC-023 says no route may edit or delete an entry. If that guarantee lives in application code, any future code path — including one written by an AI agent — can violate it, and a compromised application can erase its own tracks. Revoking the privilege means the guarantee holds **even if the application is fully compromised**, because the credential the application holds cannot express the operation.

## What this is NOT — stated precisely

**This is not mathematical or cryptographic immutability, and it must not be described as such.**

The correct claim is: *"append-only and protected from mutation by application and administrator roles."*

The infrastructure owner necessarily retains emergency database-level capability — someone must be able to restore a corrupted database, and that power cannot be revoked without making the system unrecoverable. The control defends against a compromised application, a malicious administrator and a careless code path. **It does not defend against the infrastructure owner**, and no database-level scheme can.

### Stronger tamper evidence — evaluated, not adopted

| Option | Adds | Verdict |
|---|---|---|
| **Chained hash** — each row carries a hash over its content plus the previous row's hash | Detects retrospective edits and deletions of interior rows | **Not adopted for V1.** Real value, but it needs a verification job, a break-glass repair procedure, and care under concurrent inserts. Disproportionate for a platform with a handful of administrators. |
| **Periodic signed digest** — a daily digest of the log's head, signed and stored separately | Detects wholesale tampering with low complexity | **Recommended if OD-019 or a future audit obligation requires demonstrable tamper evidence.** Roughly half a developer-day. |

**Neither is added now.** Recorded so the option is a decision, not an oversight.

## What is recorded

| Category | Examples | Requirement |
|---|---|---|
| Enforcement | Suspend · ban · reinstate · delete content · restore content | ADMIN-FR-004/006/007/008, BR-038 |
| Verification | Grant / revoke organization badge, with reason | ADMIN-FR-010 |
| Publication | Announcement published · broadcast sent | ADMIN-FR-009, NOTIF-FR-005 |
| **Sensitive views** | Viewing a user's phone, email or date of birth | **SEC-022, PRIV-008** |
| **Reported-conversation access** | Which admin opened which conversation, and when | **PRIV-009, MSG-FR-007** |
| Authentication | Every admin login | AUTH-FR-011 |

Each entry: actor admin id, action type, target type and id, mandatory reason where applicable, timestamp, correlation id.

**Viewing is an auditable event, not merely acting.** That is what makes PRIV-008 and PRIV-009 enforceable rather than aspirational.

## Retention
Audit entries are **not** subject to the 30-day account erasure. When a user is erased, audit rows referencing them retain the pseudonymous user id but no personal data — the log records that an action occurred against an account, which is the point of an audit trail. **Flagged for legal confirmation under OD-019.**

## Reason enforcement
A `CHECK` constraint requires a non-empty reason of at least 5 characters for every action type that BR-038 covers. The database, not the controller, is the enforcement point.

## Benefits
Immutability survives application compromise; one queryable table; sensitive-view logging makes privacy claims verifiable.

## Disadvantages
The table only grows — monitored, and partitionable by month later. A genuine correction cannot be made; a compensating entry must be appended instead, which is correct for an audit log.

## Security impact
Strongly positive, and it directly satisfies SEC-022 and SEC-023 with a mechanism rather than a policy.

## Privacy impact
The log itself holds sensitive metadata — who looked at whose phone number. Access is admin-only and read-only, and reading the audit log is itself recorded.

## Operational impact
One privilege grant in the migration baseline. **A CI check asserts the revocation is still in place** so a future migration cannot silently restore it.

## Revisit trigger
Volume requiring partitioning. Immutability is not revisitable.
