# 00 — Repository Audit

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Audit date: **1 September 2026** · Auditor: Stage 5 foundation engineering

---

## 1. Summary

The repository is **documentation-only**. There is no Git repository, no application code, no build tooling and no CI. Stage 5 is therefore a **greenfield foundation build**, not a migration.

**The decisive finding is not in the repository — it is the machine.** Of the toolchain Stage 4 requires, only Node and Git are present. **No JDK, no Android SDK, no Docker and no PostgreSQL.** Several Stage 5 Definition-of-Done items cannot be executed until those are installed, and this document states exactly which.

---

## 2. Git

| Check | Result |
|---|---|
| Git repository initialised | ❌ **No** — `fatal: not a git repository` |
| Existing branch | — none |
| Existing remote | — none |
| Commit history | — none |
| Uncommitted changes | n/a |

**Consequence:** Git can be initialised cleanly with `main` as the default branch. There is no history to preserve, no branch to protect, and no force-push risk.

---

## 3. Repository contents

**63 files, all documentation.**

```
D:\App\
└── docs/
    ├── product-scope-v1.html          Stage 1 · approved
    ├── srs-mvp-v1.html                Stage 2 · approved
    ├── uiux-spec-v1.html              Stage 3 · approved
    ├── prototype.html                 Stage 3 · approved
    └── architecture/                  Stage 4 · approved & frozen (59 files)
        ├── STAGE-4-APPROVAL.md
        ├── 00-18 architecture documents (19)
        ├── adr/ADR-001…022 (22)
        ├── diagrams/*.mmd (13)
        ├── contracts/ (3)
        └── technical-architecture-v1.html
```

### Classification

| Path | Class | Rationale |
|---|---|---|
| `docs/product-scope-v1.html` | **KEEP — do not modify** | Stage 1 approved source |
| `docs/srs-mvp-v1.html` | **KEEP — do not modify** | Stage 2 approved source |
| `docs/uiux-spec-v1.html` | **KEEP — do not modify** | Stage 3 approved source |
| `docs/prototype.html` | **KEEP — do not modify** | Stage 3 approved source |
| `docs/architecture/**` | **KEEP — do not modify** | Stage 4 approved and frozen |
| Everything else | **CREATE** | Nothing else exists |

**Nothing is classified MODIFY, REPLACE, REMOVE or REVIEW REQUIRED.** There is no pre-existing work to disturb.

### Files that do NOT exist

Applications · package manifests · Gradle project · Dockerfiles or Compose · environment files · CI workflows · migrations · `.gitignore` · `README.md` · `.github/` · scripts · shared packages.

### Accidental secrets

**None.** Searched for `*.env*`, `*.pem`, `*.key`, `*serviceAccount*`, `*.jks`, `*.keystore` — no matches. The repository has never held a credential, because it has never held anything but documentation.

---

## 4. Toolchain availability — the material finding

Verified through both Git Bash and PowerShell, and by checking standard Windows install locations.

| Tool | Required for | Status |
|---|---|---|
| **Git** 2.53.0 | Everything | ✅ Available |
| **Node.js** 24.14.1 | API · Admin · Worker · packages | ✅ Available — see §5 |
| **npm** 11.11.0 | Workspace management | ✅ Available |
| **Python** 3.14.6 | Scripts, tooling | ✅ Available |
| **VS Code** | Development | ✅ Available |
| **JDK** | Android build, Gradle | ❌ **MISSING** |
| **Android SDK** | Android build, emulator, RTL verification | ❌ **MISSING** |
| **Gradle** | Android build *(wrapper would supply it, but needs a JDK)* | ❌ **MISSING** |
| **adb** | Device/emulator testing | ❌ **MISSING** |
| **Docker** | Local PostgreSQL, Compose | ❌ **MISSING** |
| **PostgreSQL / psql** | Migrations, roles, audit privilege tests, backup rehearsal | ❌ **MISSING** |
| **pnpm** | Workspace manager named in ADR-015 | ❌ Missing — see FOUNDATION-CONFLICT-001 |
| **gh** | GitHub operations | ❌ Missing — external actions need authorisation regardless |

**Environment variables:** `JAVA_HOME`, `ANDROID_HOME` and `ANDROID_SDK_ROOT` are all unset. No Java, Android SDK, Docker or PostgreSQL directory exists in any standard location.

**Network:** npm registry reachable and writable cache confirmed. Dependency installation will work.

**Disk:** 41 GB free on `D:`. Sufficient.

---

## 5. Node.js version

Verified against official Node.js documentation on 1 September 2026:

| Fact | Source |
|---|---|
| `nodejs.org/en/download` recommends **v24.20.0 (Krypton)** as the current **LTS** | Official download page |
| Node **26.x** is **Current**, not LTS | Official download page |
| Installed locally: **v24.14.1** | `node --version` |

**Decision (Stage 5):** pin **Node.js 24.20.0** — the officially recommended LTS line, a patch upgrade from what is installed.

**Node 26 is not scheduled for adoption.** It is Current, not an LTS release, and Stage 4 forbids bleeding-edge choices. It will be re-evaluated only when it becomes an appropriate LTS release for production — not because it is newer.

> **Correction, 1 September 2026.** An earlier draft of this audit stated that "Node 24 LTS ended 26 August 2026" and proposed a scheduled migration to Node 26 on that basis. **That statement was wrong** — it came from misreading the previous-releases page, and the official download page correctly shows 24.20.0 as the recommended LTS. The claim and the migration proposal are both withdrawn. Recorded in `04-toolchain-versions.md`.

## 6. Foundation conflicts

### FOUNDATION-CONFLICT-001 — Workspace manager
**Severity:** 🟡 Low · **Blocks:** nothing

| | |
|---|---|
| **Documents** | Stage 4 ADR-015 *(Repository strategy: monorepo)* vs local toolchain |
| **Conflict** | ADR-015's **Decision** is "Monorepo". Its structure and CI sections name **`pnpm`** as the Node workspace tool. `pnpm` is not installed; `npm` 11.11.0 is. |
| **Assessment** | The approved *decision* is the monorepo, not the package manager — `pnpm` appears in supporting prose, not in the Decision or Why sections. Recording it anyway, because §1 requires conflicts to be surfaced rather than silently resolved. |
| **Options** | **A** — install pnpm and follow the prose exactly. **B** — use **npm workspaces**, already present, adequate for two developers, zero additional tooling. |
| **Recommendation** | **B — npm workspaces.** Stage 4 §7 asks for "a lightweight workspace approach suitable for two developers" and explicitly discourages adding orchestration platforms without demonstrated need. npm workspaces satisfies the monorepo decision with one fewer tool to install, pin and secure. **Migrating to pnpm later requires no structural change** — the same `apps/` and `packages/` layout, one lockfile swap. |
| **Status** | Proceeding on **B**, recorded here and in `04-toolchain-versions.md`. Reversible. |

### FOUNDATION-CONFLICT-002 — Local toolchain cannot satisfy the Stage 5 DoD
**Severity:** 🔴 High · **Blocks:** specific DoD items, listed below

| | |
|---|---|
| **Documents** | Stage 5 §40 Definition of Done vs the audited machine |
| **Conflict** | The DoD requires a local PostgreSQL to start, migrations to run, database roles and audit privileges to be tested, an Android debug build to succeed, and RTL to be verified on a device or emulator. **None of that is possible without a JDK, the Android SDK, and Docker or PostgreSQL — none of which is installed.** |
| **Assessment** | Not an architecture problem and not a repository problem. It is a workstation provisioning gap. **All of the corresponding source files, configuration, migrations, scripts and CI can still be authored**; only their *execution* is blocked. |
| **Recommendation** | Author everything now; execute the blocked items after the tools are installed. **Report Stage 5 honestly as NOT READY until the executable checks actually run** — Stage 5 §36 is explicit that success must not be claimed without execution. |
| **Status** | Open. Install list in §7. |

---

## 7. What is blocked, and what unblocks it

| DoD item | Blocked by | Unblocked by |
|---|---|---|
| Local PostgreSQL starts | No Docker, no PostgreSQL | **Docker Desktop** *(preferred — the Compose file is authored either way)* or a PostgreSQL 18 installer |
| Migrations run · migration status | Same | Same |
| Database roles defined and **privileges tested** | Same | Same |
| **Audit mutation-denial test** | Same | Same |
| Backup / restore rehearsal | Same | Same |
| API → pg-boss → Worker foundation job | Same | Same |
| **Android debug build succeeds** | No JDK, no Android SDK | **JDK 21 (Temurin)** + **Android SDK command-line tools** |
| **English LTR / Urdu RTL verification** | Same | Same, plus an emulator image or a physical device |
| Android reaches API health | Same | Same |
| GitHub repository, push, branch protection | No `gh`; **external action** | `gh` CLI **and explicit authorisation** |
| Staging deployment and rollback | No provider account; **external action** | Provider selection **and explicit authorisation** |

**Everything else in the Stage 5 scope is authorable and verifiable now**, including all TypeScript builds, linting, type checking, unit tests, architecture guardrails, localization parity checks, secret scanning and the RTL lint rule.

---

## 8. Carried-forward Stage 4 dependencies

| ID | Status | Effect on Stage 5 |
|---|---|---|
| **OD-020** — named technical owner | **Open** | **Blocks** secret ownership assignment, production provisioning and administrator provisioning. The CLI mechanism is still built; no administrator is created |
| **OD-019** — regulatory position | **Open** | Staging region is **PROVISIONAL** and reversible. No legal claim is made |
| OD-015 · OD-016 · OD-017 · OD-018 | Open | Do not affect Stage 5; they block release and launch |

---

## 9. Audit conclusion

| | |
|---|---|
| Repository | **Clean greenfield.** 63 documentation files, all approved, none to be modified |
| Secrets | **None committed.** No credential has ever existed here |
| Git | **Not initialised** — clean start available |
| Toolchain | **Node ecosystem ready. Android and database toolchains absent.** |
| Conflicts | **2** — one low and resolved, one high and open |
| Approach | **Author everything; execute what the machine allows; report the remainder honestly as blocked** |
