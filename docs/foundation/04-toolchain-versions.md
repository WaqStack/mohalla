# 04 — Toolchain Versions

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Pinned: **1 September 2026** · Authority: Stage 4 approved architecture + verified upstream registries

---

## 1. Purpose and rule

Every version below is **pinned to an exact value** and **verified against its upstream source on 1 September 2026**. No version in this document was inferred, remembered or assumed.

**The pinning rule for this project:**

> **Choose the currently supported stable release. Never choose a version because it is newer.**
> Pre-release channels — `alpha`, `beta`, `rc`, `eap`, and `Current`-but-not-LTS — are excluded from the foundation regardless of how close to release they are.

This follows Stage 4's explicit prohibition on bleeding-edge infrastructure choices, and it is the reason several "latest" versions visible in the registries below are **deliberately not adopted**.

---

## 2. Correction — Node.js LTS status

> ### ⚠️ Correction, 1 September 2026 — recorded on instruction
>
> An earlier Stage 5 draft stated that **"Node 24 LTS ended 26 August 2026"** and, on that basis, proposed a scheduled migration to **Node 26**.
>
> **Both statements were wrong and are withdrawn.**
>
> | Claim made | Verified fact |
> |---|---|
> | "Node 24 LTS ended 26 August 2026" | ❌ **False.** `nodejs.org/en/download` recommends **v24.20.0 (Krypton)** as the current **LTS** release |
> | "Migrate to Node 26" | ❌ **Withdrawn.** Node **26.x is `Current`, not LTS** — ineligible under §1 |
>
> **Cause:** misreading the *previous-releases* page as an end-of-life schedule for the active LTS line.
>
> **Resolution:** Node.js is pinned to **24.20.0 LTS**. Node 26 is **not scheduled for adoption**. It will be re-evaluated **only when it becomes an appropriate LTS release for production — not because it is newer.**
>
> No version decision in this document rests on, or is justified by, the withdrawn claim. Cross-referenced in [`00-repository-audit.md`](00-repository-audit.md) §5.

---

## 3. Node.js runtime and package manager

| Component | Pinned version | Channel | Verified against |
|---|---|---|---|
| **Node.js** | **24.20.0** | **LTS** (Krypton) | `nodejs.org/en/download` |
| **npm** | **11.19.0** | bundled with Node 24.20.0 | `npm --version` after install |
| Workspace manager | **npm workspaces** | — | FOUNDATION-CONFLICT-001 |

**Installed and verified:** Node **v24.20.0**, npm **11.19.0**.

> **Correction to the audit.** [`00-repository-audit.md`](00-repository-audit.md) recorded npm **11.11.0**, which was the version bundled with the *previously installed* Node 24.14.1. Node 24.20.0 bundles npm **11.19.0**. The pin follows the runtime.

The Node 24.20.0 archive was SHA-256 verified against `nodejs.org/dist/v24.20.0/SHASUMS256.txt` before extraction. The release metadata confirms `lts: "Krypton"`, released **2026-08-26** — **the release date of 24.20.0, which is almost certainly what the withdrawn claim in §2 misread as an LTS end date.**

**Enforcement:** `.nvmrc`, `package.json` `engines.node`, and the `node-version` input of every CI job all state `24.20.0`. A mismatch **fails CI** rather than warning.

**Node 26 is not adopted.** See §2.

### FOUNDATION-CONFLICT-001 resolution — npm workspaces, not pnpm

Stage 4 ADR-015's **Decision** is *"monorepo"*; `pnpm` appears only in its supporting prose. Stage 4 §7 asks for *"a lightweight workspace approach suitable for two developers"*. **npm workspaces** satisfies the approved decision with one fewer tool to install, pin and secure, and migrating to pnpm later requires no structural change — the same `apps/` and `packages/` layout, one lockfile swap. Recorded as **reversible**.

---

## 4. TypeScript and Node application dependencies

Resolved from the **npm registry, 1 September 2026**.

| Package | Pinned | Role |
|---|---|---|
| `typescript` | **6.0.3** | Language, all three Node apps — **not 7.0.2, see FOUNDATION-CONFLICT-004** |
| `typescript-eslint` | **8.69.0** | TypeScript parser for ESLint |
| `@types/pg` | **8.15.6** | Required — `pg` ships no bundled types |
| `@nestjs/core` | **12.0.1** | API framework (ADR-002) |
| `@nestjs/common` | **12.0.1** | API framework |
| `next` | **16.3.4** | Admin console (ADR-003) |
| `react` | **19.2.8** | Admin console |
| `socket.io` | **4.8.3** | In-process realtime (ADR-009) |
| `pg-boss` | **12.29.0** | PostgreSQL-backed job queue (ADR-010) |
| `pg` | **8.23.0** | PostgreSQL driver |
| `drizzle-orm` | **0.45.2** | Typed query layer |
| `node-pg-migrate` | **9.0.0** | Forward-only SQL migrations (ADR-008) |
| `vitest` | **4.1.11** | Unit and integration tests |
| `eslint` | **10.9.1** | Linting, including the RTL lint rule |
| `prettier` | **3.9.6** | Formatting |
| `zod` | **4.5.4** | Runtime schema validation, env parsing |

**Lockfile policy:** `package-lock.json` is committed. CI runs `npm ci`, never `npm install`. An uncommitted lockfile change fails the build.

---

## 5. Java Development Kit

| | |
|---|---|
| **Distribution** | **Eclipse Temurin (Adoptium)** |
| **Pinned version** | **21.0.12.101** |
| **Feature release** | **JDK 21 LTS** |
| **Verified against** | `winget show EclipseAdoptium.Temurin.21.JDK --versions` — highest 21.x available |
| **Install command** | `winget install --id EclipseAdoptium.Temurin.21.JDK --version 21.0.12.101 --exact` |

**Why 21 and not a later JDK:** JDK 21 is the LTS baseline that Android Gradle Plugin 9.x targets, and Gradle toolchain resolution for Android builds is stable on it. A newer non-LTS JDK is excluded by §1.

**Verified installed:** `java -version` → `openjdk version "21.0.12.1" 2026-08-18 LTS`, `javac 21.0.12.1`, `JAVA_HOME=D:\toolchain\jdk-21.0.12.1+1`.

**Installed from the Adoptium ZIP, not the MSI.** The MSI is a per-machine install requiring UAC and failed with **exit 1602** in a non-interactive shell. The ZIP is the *same release* — `jdk-21.0.12.1+1`, semver `21.0.12+101.0.LTS`, matching the winget package version `21.0.12.101` — installs without elevation, and was SHA-256 verified against the Adoptium API before extraction.

**Gradle toolchain declaration** — the build declares the JDK it needs rather than inheriting whatever is on `PATH`:

```kotlin
java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(21))
    }
}
```

> **Not `kotlin { jvmToolchain(21) }`.** That DSL comes from the standalone Kotlin plugin, which AGP 9 removes — see §7.

This keeps the Android build reproducible on a machine whose default `java` is a different major version.

---

## 6. Android SDK

Verified against Google's live SDK repository via `sdkmanager --list`, 1 September 2026.

| Component | Pinned | Verified |
|---|---|---|
| **cmdline-tools** | **13114758** (`latest`) | `commandlinetools-win-13114758_latest.zip` · HTTP 200 · 143,040,480 bytes |
| **platform-tools** (`adb`) | **37.0.1** | `adb --version` → `Version 37.0.1-15733141` |
| **SDK platform** | **android-37.0** | `sdkmanager --list_installed` |
| **build-tools** | **37.0.0** | `sdkmanager --list_installed` |

### SDK level policy

| Property | Value | Source |
|---|---|---|
| `minSdk` | **26** (Android 8.0) | 🟦 Stage 4 approved — API 26+ |
| `compileSdk` | **37** | forced by Compose — see below |
| `targetSdk` | **37** | tracks `compileSdk` |

> ### ⚠️ Correction — API 37 exists; an earlier draft of this document said it did not
>
> An earlier version of this section stated that **"android-36 is the highest stable platform published"** and that **"`build-tools;37.0.0` … has no matching platform, so it is deliberately not used."**
>
> **Both statements were wrong.**
>
> **Cause:** the availability check used a regex — `path="platforms;android-[0-9]*"` — against `repository2-3.xml`. Google now publishes platforms with **dotted minor versions**, so `android-37.0`, `android-37.1` and `android-37.2` did not match, and the check concluded 36 was the ceiling. `sdkmanager --list` shows all of them.
>
> **The error was caught by the build, not by review.** Compose BOM 2026.08.00 resolves Compose **1.12.0**, whose AAR metadata requires consumers to compile against **API 37 or later**. `compileSdk = 36` failed `checkDebugAarMetadata` with **11 issues**, each naming a Compose artifact.
>
> **Resolution:** `platforms;android-37.0` and `build-tools;37.0.0` installed; `compileSdk` and `targetSdk` raised to **37**.

**Why 37.0 and not 37.1 or 37.2.** All three are published and stable. 37.0 is the **lowest release that satisfies the Compose constraint**, which keeps the compile target as close to the tested `minSdk` surface as the dependency allows. `37.2-beta1/2/3` are excluded as pre-release under §1.

`platforms;android-36` and `build-tools;36.0.0` remain installed and are harmless; they are not referenced by the build.

**Exact package identifiers installed** — nothing resolved by an implicit "latest":

```
platform-tools
platforms;android-36        (superseded, retained)
platforms;android-37.0      (in use)
build-tools;36.0.0          (superseded, retained)
build-tools;37.0.0          (in use)
```

---

## 7. Android build toolchain

| Component | Pinned | Channel | Verified against |
|---|---|---|---|
| **Gradle** | **9.7.1** | stable | `gradle --version`, SHA-256 pinned in the wrapper |
| **Android Gradle Plugin** | **9.3.2** | **stable** | Google Maven `maven-metadata.xml` |
| **Kotlin** | **2.4.10** | **stable** | bundled via AGP 9 built-in Kotlin |
| **Compose BOM** | **2026.08.00** | stable | resolves Compose 1.12.0 |

> **AGP 9 removes the separate Kotlin plugin.** Applying `org.jetbrains.kotlin.android` alongside AGP 9.3.2 **fails the build**: *"The 'org.jetbrains.kotlin.android' plugin is no longer required for Kotlin support since AGP 9.0."* It is removed; `org.jetbrains.kotlin.plugin.compose` is still required and retained. `kotlin { jvmToolchain(21) }` is replaced by the standard `java { toolchain { … } }` block.

### Versions visible upstream and deliberately rejected

| Registry reports | Pinned instead | Reason |
|---|---|---|
| AGP `<latest>` = **9.5.0-alpha03** | **9.3.2** | `alpha`. Highest stable is 9.3.2 — 9.4.0 has only reached `rc02` |
| Kotlin `<latest>` = **2.4.20-RC2** | **2.4.10** | `RC`. Highest stable is 2.4.10 |
| Node **26.x** | **24.20.0** | `Current`, not LTS — see §2 |
| TypeScript `latest` = **7.0.2** | **6.0.3** | Stable, but unsupported by the lint toolchain — **FOUNDATION-CONFLICT-004** |
| `platforms;android-37.2-beta*` | **37.0** | pre-release |

This is §1 applied literally: the registries' own "latest" pointers resolve to **pre-release builds in two of four cases**, and the foundation takes neither.

**The Gradle wrapper is authoritative.** `gradle/wrapper/gradle-wrapper.properties` pins the distribution URL **with its SHA-256 checksum**, so no developer or CI runner can silently build against a different Gradle. No developer needs Gradle installed separately.

> ✅ **Confirmed by execution.** The AGP 9.3.2 ↔ Gradle 9.7.1 pairing works — the wrapper task, configuration and resource/AAR-metadata phases all ran under it. This was flagged as unverified in the first draft of this document and is now settled by running it, not by reading a compatibility table.

**Wrapper is authoritative and checksum-pinned:**

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-9.7.1-bin.zip
distributionSha256Sum=acd53f1edaf02f1a8ff99879f8a34b302661a057d9b063ae9e35b552f804d20a
validateDistributionUrl=true
```

---

## 7a. FOUNDATION-CONFLICT-004 — TypeScript 7 versus the lint toolchain

**Severity:** 🟠 Medium · **Resolved** · **Cost: one major version of TypeScript**

| | |
|---|---|
| **Conflict** | `typescript@7.0.2` is the current stable `latest`. `typescript-eslint@8.69.0` — the only mature TypeScript lint path — declares `typescript >=4.8.4 <6.1.0`. The two cannot both be satisfied. |
| **Consequence of choosing TS 7** | **No TypeScript parser for ESLint.** Every `.ts`/`.tsx` file becomes a parse error (34 were observed), and **the RTL gate silently stops running over the admin console entirely** — the rule is configured, matches no parseable file, and reports success. |
| **Why that is unacceptable** | 🟦 LOCALE-FR-003, BR-041 and REL-002 require full mirroring, and OD-011 explicitly forbids meeting the schedule by *"skipping RTL"*. A gate that silently stops running is worse than no gate: it reports green. |
| **Decision** | **Pin TypeScript 6.0.3** — the highest release the lint toolchain supports. |
| **Verified after the change** | ESLint parses real TypeScript (interfaces, annotations, `satisfies`, JSX); the RTL rule catches 3 violations in a nested spread and passes their logical equivalents. |
| **Revisit** | When `typescript-eslint` supports TypeScript 7. This is a **version pin, not an architectural constraint** — one line in seven manifests. |

This is §1 applied where it costs something: the *newer* stable release is rejected because adopting it would disable a required build gate.

---

## 8. Database and container platform

| Component | Pinned | Status on this workstation |
|---|---|---|
| **PostgreSQL** | **18** (major) | ❌ Not installed |
| **Docker Desktop for Windows** | latest stable | ❌ **Not installable — see §9** |
| **Docker Compose** | v2 (bundled) | ❌ Blocked with Docker Desktop |

**PostgreSQL 18** is the pinned major version because Stage 4 ADR-021 relies on native `uuidv7()`. The architecture deliberately supports **two UUIDv7 generation strategies** — native and application-generated — so that hosting is never constrained by this pin. The Compose file requests the `postgres:18` image explicitly, never `postgres:latest`.

---

## 9. Container platform — blocked, escalated, not worked around

**Gate B required verification before installing Docker Desktop.** That verification was performed and **it failed.** The findings are recorded in full in [`09-local-development.md`](09-local-development.md) and summarised here because they constrain this document's pins.

| Check | Result |
|---|---|
| Windows edition | Windows 10 **Pro**, build **19045** — supported |
| `VirtualizationFirmwareEnabled` | ✅ **True** — hardware virtualization enabled in firmware |
| `SecondLevelAddressTranslation` | ✅ **True** |
| `HypervisorPresent` | ❌ **False** — no hypervisor running |
| `LxssManager` service key | ❌ **Absent** — WSL not installed |
| `vmcompute` service key | ❌ **Absent** — Hyper-V host compute service not installed |
| `hns` service key | ❌ **Absent** — container networking not installed |
| `wsl --version` | ❌ Prints usage text — inbox stub only, no WSL2 |
| `Get-WindowsOptionalFeature` × 3 | ❌ **Access denied — requires elevation** |
| Shell elevation | ❌ **Not elevated** (`DESKTOP-LBGKODJ\mwaqa`) |

**Conclusion:** the hardware supports virtualization, but **neither Docker Desktop backend is available.** The WSL2 backend needs the `Microsoft-Windows-Subsystem-Linux` and `VirtualMachinePlatform` features; the Hyper-V backend needs `Microsoft-Hyper-V-All`. **None is installed**, enabling them requires **administrator elevation and a reboot**, and this shell is not elevated.

**Per the Gate B instruction, this is reported and not worked around.** Native PostgreSQL has **not** been installed as a substitute. The Compose file, migrations, role definitions, audit-privilege tests and backup scripts are **all authored and committed**; only their **execution** is blocked.

**The same missing features block a second deliverable:** the **Android emulator** requires WHPX/Hyper-V acceleration. **RTL verification on an emulator is blocked by the identical cause** and needs either the same features enabled or a **physical Android device over `adb`**.

---

## 10. Verification commands

Run after installation. **Every one of these must be executed and its real output recorded** before Stage 5 claims the toolchain is ready.

```bash
node --version          # expect v24.20.0
npm --version           # expect 11.11.0
git --version           # expect 2.53.0
java -version           # expect openjdk 21.0.12
javac -version          # expect javac 21.0.12
echo $JAVA_HOME         # must be set
adb --version           # expect 37.0.1
echo $ANDROID_HOME      # must be set
sdkmanager --list_installed
docker --version        # BLOCKED — see §9
docker compose version  # BLOCKED — see §9
```

---

## 11. Pin summary

| Layer | Component | Pinned |
|---|---|---|
| Runtime | Node.js | **24.20.0 LTS** |
| Runtime | npm | **11.11.0** |
| Language | TypeScript | **7.0.2** |
| API | NestJS | **12.0.1** |
| Admin | Next.js / React | **16.3.4** / **19.2.8** |
| Realtime | socket.io | **4.8.3** |
| Jobs | pg-boss | **12.29.0** |
| Data | PostgreSQL | **18** |
| Migrations | node-pg-migrate | **9.0.0** |
| JVM | Temurin JDK | **21.0.12.101** |
| Android | cmdline-tools | **13114758** |
| Android | platform-tools | **37.0.1** |
| Android | SDK platform | **android-36** |
| Android | build-tools | **36.0.0** |
| Android | `minSdk` / `targetSdk` | **26** / **36** |
| Build | Gradle | **9.7.1** *(pairing to be confirmed)* |
| Build | AGP | **9.3.2** |
| Build | Kotlin | **2.4.10** |
| UI | Compose BOM | **2026.08.00** |
| Container | Docker Desktop | **BLOCKED — §9** |

**Pre-release versions adopted: zero.** **Versions adopted because they were newer: zero.**
