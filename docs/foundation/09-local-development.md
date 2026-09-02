# 09 — Local Development Environment

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Status: 🟢 **RESOLVED** · 2 September 2026 (was PARTIALLY BLOCKED on 1 September)

> **UPDATE — 2 September 2026.** Docker Desktop was installed and WSL2 enabled via the
> administrator steps in [`WINDOWS-ADMIN-SETUP.md`](WINDOWS-ADMIN-SETUP.md). All three
> gates pass (`docker --version` 29.7.2, `docker compose version` v5.5.0,
> `docker run --rm hello-world`). PostgreSQL 18.6 runs via Compose; migrations, roles,
> the audit-privilege tests, the queue round-trip and the backup/restore rehearsal have
> all executed. The section below is the original escalation record, kept for history.

---

## 1. Summary

The Node toolchain, the JVM toolchain and the Android SDK are **installed and verified**. **The container platform is not, and cannot be from this shell.**

Gate B required verification *before* installing Docker Desktop. That verification was performed and **it failed**. Per the Gate B instruction, this is reported and **not worked around**:

> *"If Docker Desktop cannot be used because of Windows configuration, organizational policy, or machine limitations, stop and report the issue. Do not silently switch infrastructure approaches. Native PostgreSQL installation is the fallback, not the first choice."*

**Native PostgreSQL has NOT been installed.**

---

## 2. What was verified, and how

| Check | Command | Result |
|---|---|---|
| Windows edition | `Get-CimInstance Win32_OperatingSystem` | Windows 10 **Pro**, build **19045** — supported |
| Firmware virtualization | `Win32_ComputerSystem` | `VirtualizationFirmwareEnabled: **True**` ✅ |
| SLAT | `Win32_ComputerSystem` | `SecondLevelAddressTranslation: **True**` ✅ |
| Hypervisor running | `Win32_ComputerSystem` | `HypervisorPresent: **False**` ❌ |
| WSL installed | `wsl --version` | ❌ prints usage text — **inbox stub only, no WSL2** |
| WSL service | registry `HKLM\…\Services\LxssManager` | ❌ **key absent** |
| Hyper-V compute service | registry `…\Services\vmcompute` | ❌ **key absent** |
| Container networking | registry `…\Services\hns` | ❌ **key absent** |
| Optional feature state | `Get-WindowsOptionalFeature` ×3 | ❌ **access denied — requires elevation** |
| Shell elevation | `WindowsPrincipal.IsInRole(Administrator)` | ❌ **False** (`DESKTOP-LBGKODJ\mwaqa`) |

**The registry check is the decisive one.** `Get-WindowsOptionalFeature` needs elevation, but service keys are readable without it — and all three are absent, which means the features are not merely disabled, they are **not installed**.

---

## 3. Why Docker Desktop cannot be installed

Docker Desktop needs one of two backends:

| Backend | Requires | Present |
|---|---|---|
| **WSL2** (recommended) | `Microsoft-Windows-Subsystem-Linux` + `VirtualMachinePlatform` | ❌ Neither |
| **Hyper-V** | `Microsoft-Hyper-V-All` + `vmcompute` | ❌ Neither |

**The hardware is capable** — firmware virtualization and SLAT are both enabled. The blocker is entirely Windows configuration.

Installing Docker Desktop requires **administrator elevation**; enabling the features requires **elevation plus a reboot**. This shell is not elevated and cannot elevate non-interactively — the JDK MSI install already demonstrated this, failing with **exit 1602 ("You cancelled the installation")** when the UAC prompt was auto-declined.

---

## 4. The same cause blocks the Android emulator

The Android emulator needs WHPX or Hyper-V acceleration. With `HypervisorPresent: False` and `vmcompute` absent, **the emulator cannot run here either.**

`adb devices` → empty. No physical device attached.

**This is one blocker with two consequences**, not two separate problems.

---

## 5. What is blocked

| Deliverable | Blocked by |
|---|---|
| Local PostgreSQL starts | No container platform |
| Migrations run · migration status clean | Same |
| Four database roles created and **privileges tested** | Same |
| **Audit mutation-denial test executed** | Same |
| API serves `/health/ready` against a real database | Same |
| `FOUNDATION_HEALTH_JOB` round trip through pg-boss | Same |
| Backup / restore rehearsal | Same |
| **On-device / emulator RTL verification** | No hypervisor **and** no physical device |

**Everything else is complete.** All of the above is **authored, committed, and exercised in CI** against `postgres:18` — see [`11-ci-cd.md`](11-ci-cd.md). What is missing is local execution on this workstation.

---

## 6. How to unblock — administrator required

Run **as Administrator**, then reboot:

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

```powershell
wsl --install --no-distribution
wsl --set-default-version 2
```

```powershell
winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements
```

Then verify — **all three must pass**:

```bash
docker --version
docker compose version
docker run --rm hello-world
```

Then:

```bash
npm run infra:up
npm run db:roles
npm run db:migrate
npm run smoke
```

### If Docker Desktop still cannot be used

**Do not silently substitute.** The fallback — a native PostgreSQL 18 installation — is a decision to be taken and recorded explicitly, not adopted quietly. The Compose file, migrations, roles and scripts all work against a native instance by changing `DATABASE_URL`; the cost is that developer environments stop being identical, which is precisely what the container was for.

### For RTL device verification

Either enable the features above (the emulator then works), **or** attach a physical Android device with USB debugging — `adb devices` must list it. A physical device is the better test regardless: Naskh rendering and Urdu font fallback differ between emulator images and real Pakistani-market handsets.

---

## 7. What IS installed and verified

| Tool | Version | Verified by |
|---|---|---|
| **Node.js** | **24.20.0** LTS | `node --version` → `v24.20.0` |
| **npm** | **11.19.0** | bundled with Node 24.20.0 |
| **Git** | 2.53.0 | `git --version` |
| **JDK** | **21.0.12.1** Temurin | `java -version`, `javac -version` |
| **Android cmdline-tools** | 13114758 | `sdkmanager --list_installed` |
| **Android platform-tools** | **37.0.1** | `adb --version` |
| **SDK platform** | **android-36** | `sdkmanager --list_installed` |
| **build-tools** | **36.0.0** | `sdkmanager --list_installed` |
| **Gradle** | **9.7.1** | `gradle --version` |

Installed to `D:\toolchain\`, outside the repository. Every archive was **SHA-256 verified against its publisher's checksum** before extraction.

Environment variables persisted at **User scope** — no elevation needed:

```
JAVA_HOME        = D:\toolchain\jdk-21.0.12.1+1
ANDROID_HOME     = D:\toolchain\android-sdk
ANDROID_SDK_ROOT = D:\toolchain\android-sdk
```

### Why archives rather than installers

The Temurin MSI failed with **exit 1602** — it is a per-machine install requiring UAC. The Adoptium **ZIP** is the *same release* (`jdk-21.0.12.1+1`, semver `21.0.12+101.0.LTS`, identical to the winget package version `21.0.12.101`), installs without elevation, and pins more precisely because the checksum is verified explicitly.

This is a change of **installation method**, not of tool, version or vendor — unlike the Docker → native-PostgreSQL substitution, which would change the infrastructure approach and is therefore escalated rather than taken.
