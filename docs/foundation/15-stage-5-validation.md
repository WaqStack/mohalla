# 15 — Stage 5 Validation

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Validation date: **1 September 2026**

---

# Verdict: 🟡 DEVELOPMENT ENVIRONMENT **PARTIALLY** READY

**Not "READY".** Every deliverable that can be executed on this workstation has been executed and passes. **Eight cannot be executed here**, all blocked by a single verified cause, and none of them is reported as a pass.

| | |
|---|---|
| Executed and passing | **21** |
| Failing | **0** |
| **Blocked — could not be executed** | **8** |
| Awaiting confirmation (Gate C) | **1** |
| Deferred by instruction (Gate D) | **1** |

---

## 1. What was executed, with real results

### Toolchain

| Check | Command | Result |
|---|---|---|
| Node | `node --version` | ✅ **v24.20.0** |
| npm | `npm --version` | ✅ **11.19.0** |
| Git | `git --version` | ✅ 2.53.0 |
| JDK runtime | `java -version` | ✅ `openjdk version "21.0.12.1" 2026-08-18 LTS` |
| JDK compiler | `javac -version` | ✅ `javac 21.0.12.1` |
| `JAVA_HOME` | persisted, User scope | ✅ `D:\toolchain\jdk-21.0.12.1+1` |
| `adb` | `adb --version` | ✅ `Version 37.0.1-15733141` |
| `ANDROID_HOME` / `ANDROID_SDK_ROOT` | persisted, User scope | ✅ `D:\toolchain\android-sdk` |
| SDK packages | `sdkmanager --list_installed` | ✅ platform-tools 37.0.1 · platforms;android-37.0 · build-tools;37.0.0 |
| Gradle | wrapper, SHA-256 pinned | ✅ 9.7.1 |

**Every archive was SHA-256 verified against its publisher's checksum before extraction** — JDK against the Adoptium API, Node against `SHASUMS256.txt`, Gradle against `services.gradle.org`.

### Build

| Target | Result |
|---|---|
| `@mohalla/api` | ✅ **exit 0** |
| `@mohalla/worker` | ✅ **exit 0** |
| `@mohalla/admin` | ✅ **exit 0** — compiled 24.6 s, 2 static routes |
| Android `assembleDebug` | ✅ **BUILD SUCCESSFUL** — `app-debug.apk`, **11 MB** |
| Android clean rebuild from scratch | ✅ **BUILD SUCCESSFUL** |

### Quality gates

| Gate | Result |
|---|---|
| `prettier --check .` | ✅ **PASS** |
| `eslint .` | ✅ **PASS — 0 errors** |
| Module dependency direction | ✅ **17 modules (5/10/2), direction clean** |
| Localization parity | ✅ **9 keys, en/ur parity complete** |
| Secret scan | ✅ **197 tracked files, no secrets** |
| Android unit tests | ✅ **3 tests, 0 failures, 0 errors** |

---

## 2. Every gate was proven by making it fail

A guard that has never been seen to fail is not evidence of anything. Each was deliberately broken, observed to fail, and restored.

| Gate | Injected fault | Result |
|---|---|---|
| Module direction | `platform/identity` imports `product/posts` | ❌ exit 1, named file and both tiers |
| Module direction | `platform/audit` imports `admin/moderation` | ❌ exit 1 |
| Module registry | Unregistered directory `product/__ghost` | ❌ exit 1 |
| Locale parity | Urdu key deleted | ❌ exit 1, named the key |
| Locale parity | Urdu value set to whitespace | ❌ exit 1 |
| Secret scan | `AKIA…`, `const dbPassword = "…"`, `password: 'literal'` | ❌ exit 1, all three caught |
| RTL lint | `marginLeft`, `paddingRight`, `borderTopLeftRadius`, `left`, `textAlign:'left'` | ❌ 5 errors, each citing LOCALE-FR-003 / BR-041 / REL-002 |
| RTL lint | Same inside real TypeScript — interface, `satisfies`, JSX, nested spread | ❌ 3 errors |
| RTL lint | Logical equivalents | ✅ exit 0 — no false positives |
| Android localization | Urdu string deleted | ❌ `every english key has an urdu translation FAILED` |
| Android RTL | `android:supportsRtl="false"` | ❌ `manifest declares supportsRtl FAILED` |
| Smoke test | No database available | ⚠️ **7 BLOCKED, exit 2** — correctly refused to report a pass |

---

## 3. Three defects found by executing rather than reviewing

These are recorded because each would have shipped as a silent hole.

### 3.1 🔴 The Android RTL gate was not running at all

Deleting an Urdu string **and** setting `supportsRtl="false"` produced a **passing build**.

The tests were correct — they did not run. `LocalizationParityTest` reads resource files at runtime through relative `File(...)` paths, which Gradle cannot infer, so `testDebugUnitTest` was **UP-TO-DATE** whenever only those files changed — precisely when the gate matters.

**Fixed** by declaring the resources and manifest as task inputs. Re-verified: both faults now fail the build with no `--rerun-tasks`.

CI was never exposed (a fresh checkout has no up-to-date state), but every local run and any build-cache hit was. **A gate that reports green without running is worse than no gate.**

### 3.2 🟠 The module dependency guard failed open after formatting

Running Prettier converted `modules.registry.ts` to single quotes. The guard parsed the registry with a regex matching **double quotes only**, so it parsed **zero** registered modules and then reported all 17 directories as "unregistered".

It failed loudly this time. The dangerous variant is the same class of bug in the opposite direction — a registry that parses to an empty list while the import scan still runs, reporting "clean". **Fixed** to accept either quote style, and the negative test re-run afterwards.

### 3.3 🟠 `compileSdk = 36` was wrong, and my stated reason for it was false

I wrote that *"no `platforms;android-37` is published"*. It is. The availability check used the regex `platforms;android-[0-9]*`, and Google now publishes **dotted** platform versions — `android-37.0`, `37.1`, `37.2` — which did not match.

Caught by `checkDebugAarMetadata` failing with **11 issues**: Compose 1.12.0 requires consumers to compile against API 37+. **Fixed** by installing `platforms;android-37.0` + `build-tools;37.0.0` and raising `compileSdk`/`targetSdk` to 37. `minSdk` remains **26** — the approved constraint is untouched.

---

## 4. What is BLOCKED — one cause, eight consequences

**Root cause: this workstation has no container platform and no hypervisor, and the shell cannot elevate.**

| Verified | Value |
|---|---|
| `VirtualizationFirmwareEnabled` | ✅ True — the hardware is capable |
| `SecondLevelAddressTranslation` | ✅ True |
| `HypervisorPresent` | ❌ **False** |
| `LxssManager` / `vmcompute` / `hns` service keys | ❌ **All absent — features not installed** |
| `wsl --version` | ❌ prints usage — inbox stub only |
| Shell elevated | ❌ **False** |

| # | Blocked deliverable |
|---|---|
| 1 | Local PostgreSQL starts |
| 2 | Migrations run · migration status clean |
| 3 | Four database roles created and privileges tested |
| 4 | **Audit mutation-denial test executed** |
| 5 | API serves `/health/ready` against a real database |
| 6 | `FOUNDATION_HEALTH_JOB` round trip through pg-boss |
| 7 | Backup / restore rehearsal |
| 8 | **On-device or emulator RTL verification** (emulator needs the same hypervisor; `adb devices` = 0) |

**All eight are authored, committed, and exercised by the CI `database` job against `postgres:18`.** What is missing is execution here.

**Per Gate B, this was escalated and not worked around. Native PostgreSQL has NOT been installed.**

Unblock instructions: [`09-local-development.md`](09-local-development.md) §6.

---

## 5. Conflicts recorded in Stage 5

| ID | Severity | Status |
|---|---|---|
| **FOUNDATION-CONFLICT-001** | 🟡 Low | ✅ Resolved — npm workspaces, not pnpm. Reversible |
| **FOUNDATION-CONFLICT-002** | 🔴 High | ⛔ **Open** — the workstation cannot satisfy 8 DoD items (§4) |
| **FOUNDATION-CONFLICT-003** | 🟡 Low | ✅ Resolved — Stage 4 says "15 modules" in four places but **enumerates 17**. 17 shells created; frozen documents unmodified |
| **FOUNDATION-CONFLICT-004** | 🟠 Medium | ✅ Resolved — TypeScript pinned to **6.0.3**, not 7.0.2, because `typescript-eslint` requires `<6.1.0` and TS 7 would **silently disable the RTL gate** |

---

## 6. Carried-forward Stage 4 dependencies

| ID | Effect on Stage 5 |
|---|---|
| **OD-020** — named technical owner | Blocks: `CODEOWNERS` holds a placeholder; "require Code Owner review" cannot be enabled; no secret owner; **no administrator account created** |
| **OD-019** — regulatory position | Blocks region selection. A reason the Gate D deferral is correct, not merely instructed |
| **DEP-002** — SMS provider | Not needed in Stage 5. **RSK-007 now rests entirely on it**, since OD-021 Option C removed email registration as the mitigation |
| OD-015 · OD-016 · OD-017 · OD-018 | Block release, not Stage 5 |

---

## 7. Definition of Done

| Item | Status |
|---|---|
| Repository audited and classified | ✅ |
| Git initialised on `main`, no remote | ✅ |
| Monorepo with workspaces | ✅ verified — 7 packages linked |
| Toolchain pinned and installed | ✅ all checksum-verified |
| API foundation — health endpoints only | ✅ builds |
| 17 module shells with enforced boundaries | ✅ verified by negative test |
| Worker foundation + `FOUNDATION_HEALTH_JOB` | ✅ builds |
| Admin foundation | ✅ builds |
| Android foundation | ✅ **APK built** |
| RTL gate | ✅ verified in both directions, web **and** Android |
| Design tokens | ✅ **generated from the approved prototype**, not retyped |
| Localization parity gate | ✅ verified |
| Database roles, migrations, audit foundation | ⚠️ **authored, not executed** — §4 |
| Audit mutation-denial test | ⚠️ **written, not executed** — §4 |
| Local dev environment | ⚠️ **Compose authored, cannot run** — §4 |
| Environment variable contract | ✅ zod-validated, refuses to start |
| Secret management | ✅ scan verified against 197 tracked files |
| CI workflows | ⚠️ **authored, never executed** — no repository exists |
| CD / staging | 🛑 **DEFERRED — STAGE 5B** by Gate D |
| Foundation smoke test | ⚠️ **runs, reports 7 BLOCKED, exit 2** |
| Documentation — 16 documents | ✅ |
| GitHub repository | ⏳ **PROPOSAL ONLY — awaiting confirmation** (Gate C) |

---

## 8. Honest statement

**The foundation is not "ready" and is not reported as ready.**

What is true: four applications build, every architecture and safety gate has been proven to fail when violated, the Android APK exists, and the toolchain is pinned and checksum-verified.

What is not true, and is not claimed:

- **No database has ever been started.** Roles, migrations and the audit privilege model are code that has not run outside CI's definition.
- **The append-only audit guarantee is untested on this machine.** It is the single most important security property in the foundation and its test has not executed here.
- **The Android app has never been launched.** The APK builds; no device or emulator has run it.
- **RTL has never been seen mirrored.** The lint rule, the string parity test and the `supportsRtl` assertion all pass — none of them is a person looking at an Urdu screen.
- **No CI workflow has ever run.**

Three real defects were found in this stage **only because gates were deliberately broken instead of trusted**. That is the strongest evidence in this document, and it is also the reason the remaining unexecuted items should not be assumed correct.

**Stage 5 is not complete.** It completes when the items in §4 execute and pass.
