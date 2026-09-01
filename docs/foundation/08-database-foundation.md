# 08 — Database Foundation

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
PostgreSQL **18** · Migrations: **node-pg-migrate 9.0.0** (ADR-008) · Roles: **4** (ADR-018)

---

## 1. Status

**Authored and committed in full. Not executed.** No PostgreSQL instance is reachable on this workstation — see [`09-local-development.md`](09-local-development.md). Everything below is code that exists and has been syntax-checked; **none of it has been run against a live database**, and nothing here claims otherwise. CI runs all of it against `postgres:18` on every push.

---

## 2. Four roles

| Role | May do | May not |
|---|---|---|
| `migration_owner` | Owns every object. The **only** role that may run DDL | Serve traffic |
| `runtime_app` | DML on product tables. **INSERT + SELECT only** on `audit_log` | DDL. **UPDATE/DELETE audit** |
| `runtime_worker` | DML + its own `pgboss` schema | DDL. **UPDATE/DELETE audit** |
| `read_only_support` | `SELECT` on explicitly granted non-identifying views | Everything else |

None is a superuser; none may create databases or roles.

**`read_only_support` deliberately has no blanket table grant.** Support connects and sees nothing until a specific non-identifying view is granted. Privacy requirements keep phone, email and date of birth away from support staff, and the correct starting state is zero access rather than "everything except what we remembered to revoke". No such view exists yet, so support currently sees `platform_meta` and nothing more.

**No password appears in `roles.sql` or anywhere in the repository.** Passwords are passed as `psql` variables from environment values at apply time.

---

## 3. The audit log — what is guaranteed, stated exactly

> **The audit log is append-only and protected from mutation by application and administrator roles.**

Enforced twice, and the two are **not** equivalent:

**1. Privilege — the actual boundary.**
```sql
REVOKE ALL ON audit_log FROM runtime_app, runtime_worker;
GRANT SELECT, INSERT ON audit_log TO runtime_app;
GRANT SELECT, INSERT ON audit_log TO runtime_worker;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM runtime_app, runtime_worker;
```
A role without the privilege cannot mutate a row whatever SQL it sends. **Every application administrator acts through `runtime_app`**, so no in-app admin — however privileged in the product's own permission model — can alter or erase an audit row.

**2. Trigger — defence in depth, not a boundary.** `BEFORE UPDATE`, `BEFORE DELETE` and `BEFORE TRUNCATE` triggers raise `insufficient_privilege`. This catches a mistake made *while connected as the owner*, e.g. during a migration. **The owner can drop the trigger**, so it is a guard rail, not security.

### What is NOT guaranteed

**Neither protects against the infrastructure owner.** A superuser, or whoever holds the managed provider's owner credential, retains an emergency capability to alter any table. That capability is **deliberate** — there must be a route to repair a corrupted database — and it means audit integrity also depends on **restricting who holds that credential**, which is an operational control documented in [`12-secret-management.md`](12-secret-management.md), not a schema one.

This is stated plainly because the alternative — claiming the log is "immutable" — would be false.

### Test

`packages/db/tests/audit-append-only.test.ts` connects **as `runtime_app`**, the role the API actually uses, and asserts INSERT succeeds while UPDATE, DELETE and TRUNCATE are refused and the row is unchanged afterwards.

It deliberately does **not** connect as the owner. Testing as the owner would prove only that the trigger fires — and the trigger is the weaker of the two mechanisms.

### Privacy constraint on `metadata`

`audit_log.metadata` **must never contain** a phone number, email, date of birth or password hash. The log is retained pseudonymously after erasure (OD-019), so anything identifying written there would **survive a deletion request**.

---

## 4. UUIDv7 — two strategies, so hosting is never constrained

🟩 **ADR-021.** Native `uuidv7()` arrived in PostgreSQL 18. Migration `0001` **detects** rather than assumes:

```sql
has_native := to_regprocedure('uuidv7()') IS NOT NULL;
```

| Detected | Result | Recorded in `platform_meta` |
|---|---|---|
| Native available | `app_uuid_v7()` wraps `uuidv7()` | `uuid_strategy = native_pg_uuidv7` |
| Not available | Application generates the identifier | `uuid_strategy = application_generated` |

**The migration does not fail on an older server.** If a managed provider offers only PostgreSQL 17, the platform still runs. The strategy in force is queryable rather than assumed.

---

## 5. Migrations — forward-only

🟩 **ADR-008.** `down` exists for local development and **is never run against staging or production**. Recovery from a bad migration is a new forward migration, not a reversal — a `down` that has never been rehearsed against production data is a liability, not a safety net.

| Migration | Creates |
|---|---|
| `0001_foundation_baseline` | `pgcrypto`, `platform_meta`, UUIDv7 strategy detection |
| `0002_foundation_audit_log` | `audit_log`, indexes, privileges, mutation-denial triggers |

**No product table exists.** No `users`, no `posts`, no `events`. Those belong to their epics.

`npm run db:migrate:status` **exits non-zero** when disk and database disagree — in either direction, including a migration applied that is no longer on disk. It is a gate, not a report.

---

## 6. Local development defaults, and why they are safe

The Compose file uses `POSTGRES_PASSWORD: mohalla_local_dev_only`, bound to `127.0.0.1` only. It is not a secret, is not reused anywhere, and the loopback binding matters: without the `127.0.0.1:` prefix Docker publishes the database on **every interface on the machine**.

`--locale=C` at initdb gives deterministic collation, so index behaviour matches across developer machines and CI.
