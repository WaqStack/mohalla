# Windows Administrator Setup — Docker / WSL2

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**

---

# 🟥 USER ACTION REQUIRED — WINDOWS ADMINISTRATOR

Everything in the Stage 5 foundation that does **not** need a container platform is
already built and verified. **One capability is blocked and cannot be unblocked without
Administrator rights: a local PostgreSQL, which runs in Docker.**

This guide is the exact, minimal set of steps to unblock it. Run them in an **elevated**
PowerShell (right-click → *Run as administrator*). Nothing here can be done from the
non-elevated automation shell, which is why it was not done automatically.

---

## Why this is blocked (verified, not assumed)

| Check | Result | Meaning |
|---|---|---|
| `VirtualizationFirmwareEnabled` | ✅ True | The **hardware is capable** |
| `SecondLevelAddressTranslation` | ✅ True | SLAT present |
| `HypervisorPresent` | ❌ False | No hypervisor is running |
| `LxssManager` service key | ❌ Absent | **WSL is not installed** |
| `vmcompute` service key | ❌ Absent | Hyper-V host compute not installed |
| `hns` service key | ❌ Absent | Container networking not installed |
| Current shell elevated | ❌ False | Cannot enable features or install Docker |

The blocker is **entirely Windows configuration**, not hardware. Enabling the two
Windows features requires elevation **and a reboot**; installing Docker Desktop requires
elevation. The automation shell has neither.

> An earlier attempt to install the JDK via its MSI already demonstrated the elevation
> boundary — it failed with **exit 1602 (user cancelled)** when the UAC prompt was
> auto-declined in the non-interactive shell. The JDK was then installed a different way
> (a user-scope ZIP). **Docker Desktop has no such user-scope path** — it needs the
> Windows virtualization features, which only an administrator can enable.

---

## Step 1 — Confirm virtualization is on in firmware

Already verified as **True** on this machine, so you can normally skip this. If a later
step reports virtualization is off, reboot into UEFI/BIOS and enable **Intel VT-x /
AMD-V** (often labelled "Virtualization Technology" or "SVM").

```powershell
# Should print True
(Get-CimInstance Win32_ComputerSystem).VirtualizationFirmwareEnabled
```

## Step 2 — Enable the two Windows features (elevated)

```powershell
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart
```

## Step 3 — Reboot

**Required.** The features are not active until the machine restarts.

```powershell
Restart-Computer
```

## Step 4 — Install / update WSL2 and set it as default (elevated, after reboot)

```powershell
wsl --install --no-distribution
wsl --set-default-version 2
```

Verify:

```powershell
wsl --version
wsl --status
```

`wsl --version` should now print a real version block (WSL kernel, WSLg, MSRDC, …). If it
still prints usage text, WSL2 did not install — re-check Steps 2–3.

## Step 5 — Install Docker Desktop with the WSL2 backend (elevated)

```powershell
winget install --id Docker.DockerDesktop --exact --accept-package-agreements --accept-source-agreements
```

Docker Desktop **4.89.0** is the version winget currently offers and is confirmed
available. During first launch, in **Settings → General**, ensure **"Use the WSL 2 based
engine"** is checked.

## Step 6 — Verify Docker actually works

**Do not consider Docker installed until all three of these succeed:**

```powershell
docker --version
docker compose version
docker run --rm hello-world
```

`docker run --rm hello-world` is the one that matters — it proves the engine can pull an
image and run a container, not merely that the CLI is on PATH.

---

## Then: hand back to the automation

Once the three commands above pass, the remaining Stage 5 work resumes automatically. In
the project's development shell:

```bash
npm run infra:up          # starts PostgreSQL 18 in Docker
npm run db:roles          # creates the four roles
npm run db:migrate        # applies migrations
npm run db:migrate:status # must report clean
npm run smoke             # full foundation smoke test, including the audit privilege test
```

The next instruction to the assistant is simply:

> **Resume Stage 5.**

It will then continue from **Docker verification** — running migrations, the role and
audit-privilege tests, the API↔DB↔worker chain, and the backup/restore rehearsal —
**without repeating any of the work already completed.**

---

## What this unblocks

| Currently BLOCKED | Unblocked by this guide |
|---|---|
| Local PostgreSQL starts | ✅ |
| Migrations run · migration status | ✅ |
| Four DB roles created and **privileges tested** | ✅ |
| **Audit mutation-denial test executed** | ✅ |
| API `/health/ready` against a real database | ✅ |
| `FOUNDATION_HEALTH_JOB` round trip through pg-boss | ✅ |
| Backup / restore rehearsal | ✅ |

## What this does NOT unblock

- **On-device / emulator RTL verification.** The Android emulator needs the same
  hypervisor, so Steps 2–3 also enable it — but a **physical Android device over `adb`**
  is the better test regardless, because Naskh rendering and Urdu font fallback differ
  between emulator images and real Pakistani-market handsets. Static RTL verification is
  already complete; see [`rtl-verification.md`](rtl-verification.md).
- **Anything requiring OD-019 (region) or OD-020 (named owner).** Those are product /
  organisational decisions, not machine configuration.

---

## Safety notes

- These commands enable **Windows-standard virtualization features** used by WSL2 and
  Docker Desktop. They do not weaken security posture beyond what running Docker requires.
- If organisational policy forbids enabling WSL2 or Hyper-V on this machine, **stop**. Do
  not install a native PostgreSQL as a silent substitute — that is a recorded decision to
  be taken explicitly, not a workaround. The Compose file, migrations, roles and scripts
  all work against a native PostgreSQL 18 by changing `DATABASE_URL`, but doing so means
  developer environments are no longer identical, which is the reason the container was
  chosen. Raise it rather than route around it.
