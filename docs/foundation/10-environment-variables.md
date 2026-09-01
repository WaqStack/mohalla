# 10 — Environment Variables

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Template: [`.env.example`](../../.env.example) · Validation: **zod, at process start**

---

## 1. Rule

**The process refuses to start when configuration is missing or malformed.**

`apps/api/src/config/env.ts` and `apps/worker/src/config/env.ts` parse `process.env` with zod **before** the framework boots. A process that starts with half its configuration fails later, under load, in a way that is far harder to diagnose than a refusal at startup.

**Validation failures print field names and messages only — never values.** Environment values are frequently secrets, and a stack trace containing a password ends up in a log aggregator, then in a backup, then everywhere.

---

## 2. Active contract

| Variable | Required | Default | Used by | Notes |
|---|---|---|---|---|
| `NODE_ENV` | no | `development` | api, worker | `development` \| `test` \| `staging` \| `production` |
| `LOG_LEVEL` | no | `info` | api, worker | |
| `PORT` | no | `3000` | api | validated 1–65535 |
| **`DATABASE_URL`** | **yes** | **none** | api, worker | 🔒 In deployed environments this is **`runtime_app`** — never the owner, never `migration_owner`. The API must not be able to run DDL |
| `DATABASE_POOL_MAX` | no | `10` | api | validated 1–50 |
| `PGBOSS_SCHEMA` | no | `pgboss` | worker | |
| `MIGRATION_DATABASE_URL` | migrations only | none | `npm run db:migrate` | 🔒 `migration_owner`. Held by a human or CI, **never by a running application** |
| `ADMIN_DATABASE_URL` | role setup only | none | `npm run db:roles` | 🔒 Cluster owner. Used once. **Not present in any application environment** |
| `ROLE_*_PASSWORD` ×4 | role setup only | none | `npm run db:roles` | 🔒 Refuses to run if still `CHANGE_ME` |
| `RUNTIME_APP_DATABASE_URL` | tests only | none | audit test, smoke test | 🔒 `runtime_app`, so the test exercises the real privileged path |

**`DATABASE_URL` deliberately has no default.** A default would let a misconfigured production process quietly connect to something unintended.

---

## 3. The three-credential separation

This is the operational expression of the four database roles:

| Credential | Held by | Lifetime |
|---|---|---|
| `ADMIN_DATABASE_URL` | A human, once, at cluster setup | Not stored in any app environment |
| `MIGRATION_DATABASE_URL` | CI deploy job, or a human | Present only while a migration runs |
| `DATABASE_URL` (`runtime_app`) | The running API | Always |

**A running application never holds a credential that can change the schema or mutate the audit log.** Compromising the API process does not yield DDL rights.

---

## 4. Documented but NOT active

`.env.example` lists these **commented out**, so the shape of the deployed contract is visible and nobody invents different names later. **The foundation does not read any of them, and filling them in enables nothing.**

| Group | Variables | Waiting on |
|---|---|---|
| SMS | `SMS_PROVIDER`, `SMS_API_KEY`, `SMS_SENDER_ID` | **DEP-002** — provider chosen after Pakistani network coverage testing |
| Object storage | `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET_QUARANTINE`, `STORAGE_BUCKET_PUBLIC` | ADR-013. **Quarantine and public are separate buckets**, not separate prefixes |
| Push | `FCM_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_JSON` | |
| Password hashing | `ARGON2_MEMORY_KIB`, `ARGON2_ITERATIONS`, `ARGON2_PARALLELISM` | **Benchmarked on the chosen host, not guessed** (Stage 4 §17) |
| Peppers | `IDENTIFIER_HASH_PEPPER`, `IP_HASH_PEPPER` | ⚠️ **Rotating either invalidates the ban list** (BR-036). Generated once, stored in the provider secret store, no second copy |

---

## 5. Local setup

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

`.env` is gitignored. `git check-ignore` was used to confirm the rule actually matches — `.env`, `apps/api/.env.production` and `secrets/db.key` are all ignored, while `.env.example` remains tracked.
