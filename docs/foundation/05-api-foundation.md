# 05 — API Foundation

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Framework: **NestJS 12.0.1** (ADR-003) · Runtime: **Node 24.20.0 LTS** · Status: **builds clean**

---

## 1. What exists

**Two routes. Seventeen empty modules. Nothing else.**

```
apps/api/src/
├── main.ts                     bootstrap; validates env before starting
├── app.module.ts               registers HealthModule + all 17 shells
├── config/env.ts               zod contract; process refuses to start if invalid
├── health/                     the only routes in the application
└── modules/
    ├── modules.registry.ts     machine-readable tier declaration
    ├── platform/    (5 shells)
    ├── product/     (10 shells)
    └── admin/       (2 shells)
```

**No authentication. No user. No post. No feed. No database table read or written by any feature.** The only SQL the process issues is `select 1`, from the readiness check.

---

## 2. Health endpoints

🟨 **PROPOSED DEFAULT.** Stage 4 requires health checks as a deployment mechanism (§14, ADR-005) but **does not specify paths or payloads**. This shape is a Stage 5 default and changeable without affecting any approved requirement.

| Route | Consults dependencies | Success | Failure |
|---|---|---|---|
| `GET /health/live` | No | `200` `{ status, uptimeSeconds }` | process is down |
| `GET /health/ready` | Yes | `200` `{ ok: true, dependencies: [...] }` | `503` |

**Why two and not one.** A liveness probe that touches the database restarts a healthy process whenever the database blips — turning a brief dependency outage into an availability incident. Liveness answers *"is this process wedged?"*; readiness answers *"should traffic come here?"* Conflating them is how a rolling restart becomes a full outage.

**The readiness check never returns the connection string.** On failure it returns the driver's error message only — a detail that matters because health endpoints are frequently exposed more widely than intended.

---

## 3. Configuration contract

`config/env.ts` parses `process.env` with zod **before** NestJS starts.

- **`DATABASE_URL` has no default.** A missing database URL stops the process.
- Failure prints **field names and messages only, never values** — environment values are frequently secrets, and a stack trace with a password in it ends up in a log aggregator.
- Bounded values are range-checked (`PORT` 1–65535, `DATABASE_POOL_MAX` 1–50) rather than merely present.

A process that boots with half its configuration fails later, under load, in a way that is far harder to diagnose than a refusal at startup.

---

## 4. Module shells

All 17 are registered in `app.module.ts` and all are empty:

```ts
@Module({ imports: [], controllers: [], providers: [], exports: [] })
export class IdentityModule {}
```

Registering them cannot create coupling — they export nothing and provide nothing. The point is that **the boundary set is complete and the dependency guard has something real to check before the first feature is written**, rather than being retrofitted onto code that already violates it.

Each shell carries a comment naming what it will own. Eight carry the specific constraint that governs them — `identity` holds the highest privacy risk in the system; `notifications` is called by nobody synchronously; `messaging` enforces idempotency in PostgreSQL rather than in transport; `audit` is append-only.

---

## 5. ESM — a forced, verified change

**NestJS 12 and pg-boss 12 are pure ESM** (`"type": "module"` in both). Under CommonJS they cannot be `require`d, and the build fails with `TS1479`.

Verified directly:

```
@nestjs/common@12.0.1   type: module
pg-boss@12.29.0         type: module
```

So `apps/api` and `apps/worker` are ESM: `"type": "module"`, `module`/`moduleResolution` = `node16`, and **all relative imports carry explicit `.js` extensions** as ESM requires.

This was not a preference. It is what the pinned dependency versions require, and it is recorded because the `.js` extensions on relative TypeScript imports look wrong to anyone who has not hit this.

---

## 6. Verified

| Check | Result |
|---|---|
| `npm run build --workspace @mohalla/api` | ✅ **exit 0** |
| `npx eslint .` | ✅ **0 errors** |
| Module dependency guard | ✅ 17 modules, direction clean |
| Guard fails on an injected upward import | ✅ exit 1 |
| API starts and serves health routes | ⏳ **BLOCKED** — needs PostgreSQL; see [`09-local-development.md`](09-local-development.md) |

**The API has not been started.** It compiles; it has not been run against a database, because no database can run on this workstation yet. That is stated rather than implied.
