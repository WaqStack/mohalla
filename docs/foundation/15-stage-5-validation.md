# 15 — Stage 5 Validation

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Validation date: **2 September 2026** (updated after Docker was enabled)

---

# Verdict: 🟢 READY FOR FEATURE DEVELOPMENT

Every mandatory local execution gate now passes **against a real running stack** —
PostgreSQL 18.6, pg-boss, and Socket.IO — not merely in source. What remains are the
items that were explicitly deferred (paid staging), await a separate authorization
(GitHub remote), or are product/organisational decisions (OD-019, OD-020). None of those
blocks feature development.

**`npm run smoke` → 8/8 PASS. `npm run verify` → 10 executable lanes pass, 0 blocked.**

---

## 1. The previously-blocked gates — now executed

Docker was enabled (WSL2 + Docker Desktop 4.89, engine 29.7.2). Everything that was
BLOCKED on a container platform has now run:

| Gate | Result |
|---|---|
| Local PostgreSQL starts | ✅ **18.6**, healthy, UTC |
| Migrations run | ✅ `0001`, `0002` applied |
| Migration status clean | ✅ `schema is up to date` |
| UUIDv7 strategy detected | ✅ `native_pg_uuidv7` (PG 18) recorded in `platform_meta` |
| Four roles created | ✅ migration_owner, runtime_app, runtime_worker, read_only_support |
| **Role privileges enforced** | ✅ 13/13 `@mohalla/db` tests, as the real roles |
| **Audit append-only, as `runtime_app`** | ✅ UPDATE/DELETE/TRUNCATE refused; row unchanged |
| API → DB (`/health/ready`) | ✅ `{"ok":true}` |
| API → Worker (`FOUNDATION_HEALTH_JOB`) | ✅ enqueue → persist → consume → `completed` |
| Socket.IO ping/pong | ✅ pong returned via ack |
| **Backup / restore rehearsal** | ✅ append-only survived on the restored DB — see [`backup-restore-rehearsal.md`](backup-restore-rehearsal.md) |

---

## 2. Full verification, real results

### Toolchain
Node **24.20.0** · npm **11.19.0** · JDK **21.0.12.1** · adb **37.0.1** · SDK **android-37.0** ·
Gradle **9.7.1** · TypeScript **6.0.3** · **Docker 29.7.2** · **Compose v5.5.0** · PostgreSQL **18.6**.

### Builds & tests — 55 automated tests + 8 live smoke checks
| | Result |
|---|---|
| api / worker / admin build | ✅ |
| Android `assembleDebug` + `lint` | ✅ APK 11 MB, 0 lint errors |
| Unit tests | ✅ api 21 · worker 8 · validation 11 · admin 6 · android 9 = **55** |
| `@mohalla/db` integration | ✅ **13** (audit + role privileges, live) |
| `npm run smoke` | ✅ **8/8** |

### `npm run verify` (local CI equivalent)
```
PASS  build shared packages
PASS  guard: module dependency direction
PASS  guard: localization parity
PASS  guard: secret scan
PASS  format check
PASS  lint (includes the RTL gate)
PASS  build all apps
PASS  unit tests (api, worker, validation, admin)
PASS  migration status
PASS  audit append-only test
PASS  android lint + unit tests        (standalone; transient daemon flake in one batched run)
```

---

## 3. Defects found by executing — 12 total across the stage

This session added six, all found by running the stack, none by review:

| # | Defect | Fix |
|---|---|---|
| 7 | `postgres:18` image rejects the `/var/lib/postgresql/data` mount (18+ uses a version subdir) | Mount at `/var/lib/postgresql` |
| 8 | `migration_owner` couldn't create the `pgcrypto` trusted extension | `GRANT CREATE ON DATABASE` to migration_owner only |
| 9 | pg-boss schema install is DDL; `runtime_worker` (DML-only) can't do it | One-time `queue:install` as migration_owner |
| 10 | Socket.IO gateway never mounted — a `useFactory` gateway has no class metatype for NestJS to discover, and `IoAdapter` isn't auto-applied | Class provider + explicit `useWebSocketAdapter` |
| 11 | Gateway ping returned a WsResponse (emits an event) while the client used an ack | Return the payload into the ack |
| 12 | Scripts assumed a host `psql`; dev env is Docker-first with none | `psql-runner.mjs` falls back to the container |

(1–6 were found earlier in the stage: Android gate not running, guard failing open,
compileSdk, TypeScript-vs-lint, zod message, non-config-aware read.)

Two environment traps also surfaced and are documented so they don't recur: Git Bash
**MSYS path conversion** mangling `/realtime` and `/tmp/...` container paths (use
`MSYS_NO_PATHCONV=1`), and **stale Windows `node.exe` processes** holding port 3000 that
`pkill -f` does not reliably kill (use `taskkill`/`Stop-Process`).

---

## 4. Definition of Done

**GIT** ✅ initialised · ✅ `main` · ✅ `.gitignore` · ✅ clean secret scan (266 files)
**REPOSITORY** ✅ monorepo · ✅ API · ✅ Worker · ✅ Admin · ✅ Android · ✅ 6 shared packages
**TOOLS** ✅ Node · ✅ Java 21 · ✅ Android SDK · ✅ adb · ✅ **Docker**
**BUILDS** ✅ API · ✅ Worker · ✅ Admin · ✅ Android
**DATABASE** ✅ PostgreSQL runs · ✅ migrations · ✅ roles verified · ✅ audit privileges · ✅ worker queue
**CONFIGURATION** ✅ env validation · ✅ no secrets committed
**CI** ✅ local verify passes · ✅ workflow YAML valid · ✅ architecture/localization/security checks
**RTL** ✅ English LTR · ✅ Urdu RTL (static + runtime switch, JVM-tested) · ⏳ device execution not verified
**SMOKE** ✅ Admin→API · ✅ API→DB · ✅ API→Worker · ✅ Socket.IO ping/pong · ⏳ Android→API on device
**OPERATIONS** ✅ backup executed · ✅ restore executed · ✅ rollback documented · ✅ staging config ready (deferred)
**STAGE BOUNDARY** ✅ **no product feature implemented**

---

## 5. What remains (none blocks feature development)

- **RTL / Android on a real device.** Static RTL is verified and the runtime en↔ur switch
  is unit-tested; a human has not yet seen it on a device. The emulator now works (hypervisor
  enabled), and a physical device over `adb` remains the better test. This is a QA step, not
  a foundation gap.
- **GitHub remote** — awaits explicit authorization ([`01-github-repository.md`](01-github-repository.md)).
- **Paid staging** — deferred to Stage 5B ([`14-staging-deployment.md`](14-staging-deployment.md)).
- **OD-019** (region), **OD-020** (named owner) — product/organisational, block production only.

---

## 6. Honest statement

The database has been started, migrated, and its four-role model verified by connecting as
each role. The append-only audit guarantee is proven live — `runtime_app` is refused
UPDATE, DELETE and TRUNCATE — and it **survives a backup/restore cycle**. The queue
round-trips through pg-boss and the Socket.IO ping returns a pong. Four apps build and 55
unit tests plus 13 database integration tests plus 8 live smoke checks pass.

The one thing not yet done is looking at an Urdu screen on a physical device. Everything the
brief lists under §41 — Android build, PostgreSQL, migrations, database roles, worker
queue, local CI, RTL foundation — is verified.

**Status: READY FOR FEATURE DEVELOPMENT.**
