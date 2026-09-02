# 15 — Stage 5 Validation

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Validation date: **2 September 2026**

---

# Verdict: 🟡 NOT READY FOR FEATURE DEVELOPMENT

**Not because anything is broken — because the database-dependent gates have not executed.**

Every Stage 5 gate that can run on this workstation has run and passes. The gates that
need a database are **BLOCKED** by one verified cause (no container platform), and Stage 5
does not reach "ready" until they execute. None is reported as a pass.

| | |
|---|---|
| Executable gates passing | **9 lanes, 55 automated tests** |
| Failing | **0** |
| **Blocked — cannot execute here** | **database migrations · roles · audit privilege · queue round-trip · backup/restore** |
| Awaiting confirmation (Gate C) | GitHub remote |
| Deferred by instruction (Gate D) | paid staging |

**`npm run verify` → 9 passed · 0 failed · 2 blocked · exit 2 (INCOMPLETE).**

---

## 1. What executed, with real results

### Toolchain (all verified this session)

| Tool | Result |
|---|---|
| Node | **v24.20.0** · npm **11.19.0** |
| JDK | `openjdk 21.0.12.1 2026-08-18 LTS` · `javac 21.0.12.1` |
| Android | `adb 37.0.1` · platform **android-37.0** · build-tools **37.0.0** |
| Gradle | **9.7.1** (wrapper, SHA-256 pinned) |
| Docker | **ABSENT — blocked**, see §4 |

### Builds

| Target | Result |
|---|---|
| `@mohalla/contracts`, `@mohalla/validation`, `@mohalla/design-tokens` | ✅ compile to `dist` |
| `@mohalla/api` | ✅ exit 0 |
| `@mohalla/worker` | ✅ exit 0 |
| `@mohalla/admin` (Next.js) | ✅ exit 0 |
| Android `assembleDebug` | ✅ **BUILD SUCCESSFUL** — `app-debug.apk`, 11 MB |
| Android `lint` | ✅ **0 errors** |

### Tests — 55 automated, 0 failures

| Suite | Count |
|---|---|
| API (`health`, `env`, `correlation`) | **21** |
| Worker (`env`, `foundation-health.job`) | **8** |
| Validation (`primitives`) | **11** |
| Admin (`env`, `api-client`) | **6** |
| Android (`LocalizationParity`, `LocaleManager`, `SecureStorage`) | **9** |

### Quality gates

| Gate | Result |
|---|---|
| Prettier format check | ✅ PASS |
| ESLint (incl. RTL gate) | ✅ 0 errors |
| Module dependency direction | ✅ 17 modules, clean |
| Localization parity | ✅ en/ur complete |
| Secret scan | ✅ 0 in tracked files |
| `npm audit` | ✅ 0 vulnerabilities |

---

## 2. What this session ADDED to the foundation

The earlier foundation had app skeletons and empty shells. This session completed the
cross-cutting infrastructure the DoD requires — **still no product feature**:

**API** — correlation-id middleware (`AsyncLocalStorage`, validates client-supplied UUIDs
before trusting them), structured JSON logging with correlation, a global error-envelope
filter (5xx detail never leaves the server), a zod validation pipe, `helmet` security
headers, an explicit CORS allow-list (never `*`), OpenAPI generation, a `DatabaseService`
with `withTransaction`, and `GET /health` / `/health/live` / `/health/ready`.

**Realtime** — a Socket.IO foundation gateway: `foundation:ping` → `foundation:pong`, no
product event, no authenticated socket.

**Worker** — retry policy on the queue, a **dead-letter queue**, dead-job logging
(`dead:true` at `error`), correlation carried in the payload, and a heartbeat reporting
real backlog.

**Admin** — env validation (rejects a secret in a `NEXT_PUBLIC_` var by construction), an
API client with correlation + timeout, an error boundary, a live health panel (the
Admin→API leg), and the design-token bridge.

**Android** — logging / secure-storage / HTTP-client abstractions behind interfaces, a
manual DI container (not Hilt — deliberately), `BuildConfig.API_BASE_URL` per build type,
and **runtime language switching**: a button flips en↔ur and the whole screen re-resolves
strings and flips LTR→RTL live, no restart.

**Shared packages** — `@mohalla/contracts` (error envelope, correlation header, health
shapes) and `@mohalla/validation` (zod primitives incl. Pakistani-mobile *format* only),
both compiled to `dist` so Node16 apps and the Turbopack bundler consume the same output.

**Ops** — backup / restore / reset scripts (guarded against overwriting the primary), a
DB role-permission test suite, an admin-provisioning CLI **mechanism** (creates nothing;
blocked on OD-020), a local CI-equivalent `npm run verify`, and an expanded CI workflow
(tests, OpenAPI generation, role privileges, queue round-trip, dependency + secret scan).

---

## 3. Defects found by executing, not reviewing

| # | Defect | Fix |
|---|---|---|
| 1 | Android RTL/localization test **passed while not running** (Gradle UP-TO-DATE; test reads resources at runtime) | Declared resource + manifest task inputs; both faults now fail |
| 2 | Module-dependency guard **failed open** after Prettier switched quotes | Guard accepts either quote style |
| 3 | `compileSdk=36` wrong; my stated reason (no android-37) false — regex missed dotted platform names | Installed android-37.0, raised to 37 |
| 4 | TypeScript 7.0.2 would **silently disable the RTL lint gate** (typescript-eslint caps at <6.1.0) | Pinned TS 6.0.3 |
| 5 | `DATABASE_URL is required` message never shown for the *missing* case (zod type check fires first) | Message set on the type check too |
| 6 | Android lint: `LocalContext…configuration` read is not configuration-aware — would return stale values on the live language switch | Use `LocalConfiguration.current` |

Six real defects, each caught by running the thing rather than trusting it. Defects 5 and 6
are from this session.

---

## 4. What is BLOCKED — one cause

**No container platform, no hypervisor, and the shell cannot elevate.** Verified again this
session: `LxssManager` / `vmcompute` / `hns` service keys all **absent**,
`HypervisorPresent: False`, shell not elevated. Hardware is capable
(`VirtualizationFirmwareEnabled: True`).

Blocked, all authored and exercised in CI against `postgres:18`, none reported as a pass:

- Local PostgreSQL starts · migrations run · migration status
- Four roles created and **privileges tested** (role-permission suite)
- **Audit mutation-denial test executed** as `runtime_app`
- `FOUNDATION_HEALTH_JOB` round-trip through pg-boss
- API `/health/ready` and the Socket.IO ping against a running stack
- Backup / restore rehearsal

**Per Gate B, escalated not worked around — native PostgreSQL was NOT installed.** The
exact elevated steps to unblock are in
[`WINDOWS-ADMIN-SETUP.md`](WINDOWS-ADMIN-SETUP.md). After Docker works, the instruction is
simply **"Resume Stage 5"** and work continues from Docker verification.

**RTL device execution** is blocked by the same missing hypervisor (emulator) plus no
physical device (`adb devices` = 0). Static RTL is fully verified — see
[`rtl-verification.md`](rtl-verification.md).

---

## 5. Definition of Done

**GIT** — ✅ initialised · ✅ `main` · ✅ `.gitignore` correct · ✅ clean secret scan

**REPOSITORY** — ✅ monorepo · ✅ API · ✅ Worker · ✅ Admin · ✅ Android · ✅ shared packages
(contracts, validation, design-tokens, db, config, eslint-plugin)

**TOOLS** — ✅ Node · ✅ Java 21 · ✅ Android SDK · ✅ adb

**BUILDS** — ✅ API · ✅ Worker · ✅ Admin · ✅ Android (APK)

**DATABASE** — ⚠️ PostgreSQL runs · ⚠️ migrations · ⚠️ roles verified · ⚠️ audit privileges ·
⚠️ queue job — **all authored, all BLOCKED on Docker (§4)**

**CONFIGURATION** — ✅ env validation (api, worker, admin all refuse bad config) · ✅ no
secrets committed

**CI** — ✅ local `verify` passes (9/9 executable) · ✅ workflow YAML valid · ✅ architecture
checks · ✅ localization checks · ✅ security scans

**RTL** — ✅ English LTR (static + runtime switch) · ✅ Urdu RTL (static + runtime switch) ·
⚠️ **device execution NOT verified** (§4)

**SMOKE** — ✅ Admin→API (health panel) · ⚠️ Android→API (client built, needs a running API)
· ⚠️ API→DB · ⚠️ API→Worker · ⚠️ Socket.IO ping — **DB/stack legs BLOCKED**

**OPERATIONS** — ⚠️ backup executed · ⚠️ restore executed (scripts ready, need DB) · ✅
rollback documented · ✅ staging config ready (deferred)

**STAGE BOUNDARY** — ✅ **no product feature implemented**

---

## 6. Honest statement

Four applications build, 55 automated tests pass, every architecture and safety gate has
been proven to fail when violated, the Android APK builds and its RTL/language switch is
real and tested on the JVM.

What is **not** true, and is not claimed:

- **No database has been started.** Roles, migrations, the audit privilege model, the
  role-permission suite and the queue round-trip are code that runs only in CI's
  definition, never on this machine.
- **The append-only audit guarantee is untested here.** Its test exists and runs in CI; it
  has not run locally.
- **The Android app has never launched**; RTL has never been *seen* mirrored on a device.
- **No CI workflow has run** — no repository exists yet (Gate C).

**Status: NOT READY FOR FEATURE DEVELOPMENT.** Per the brief's §41, the unverified items —
PostgreSQL, migrations, roles, worker queue, device RTL — hold the status there until they
execute, which requires the one administrator action in
[`WINDOWS-ADMIN-SETUP.md`](WINDOWS-ADMIN-SETUP.md). Everything else is done.
