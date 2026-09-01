# 11 — CI / CD

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Platform: **GitHub Actions** · Status: **workflows authored; not yet executed — no repository exists**

---

## 1. Honest status

The workflows below are committed and syntactically complete. **They have never run**, because Gate C means no GitHub repository exists yet. Their first execution happens on the first push, and the result is reported then — not predicted here.

Every check they run has, however, been **executed locally**, and those results are real. See [`15-stage-5-validation.md`](15-stage-5-validation.md).

---

## 2. `ci.yml` — three jobs

### `guards` — architecture and safety

| Step | Fails the build when |
|---|---|
| Module dependency direction | A module imports upward across a tier, or a module directory is unregistered |
| Localization parity | An English key has no Urdu counterpart, or an Urdu value is blank |
| Secret scan | A credential pattern appears in a **git-tracked** file |

**These are jobs, not optional steps.** An architecture rule that only fails in review is a rule that gets broken under delivery pressure — and OD-011 commits 68 working days, which is exactly that pressure.

The secret scan uses `fetch-depth: 0` and scans **tracked files**, not the working tree. Scanning the working tree would flood on `node_modules` and miss the thing that matters: whether a secret has entered version control, where it is permanent.

### `node` — lint, typecheck, build

`npm ci` (never `npm install`), format check, **lint including the RTL gate**, then build all workspaces.

### `database` — the one that proves the security model

Runs a real `postgres:18` service container and executes, in order:

1. Create the four roles
2. Run migrations as `migration_owner`
3. `db:migrate:status` must be clean
4. **Connect as `runtime_app` and prove `audit_log` refuses UPDATE, DELETE and TRUNCATE**

Step 4 is the point. The append-only guarantee is asserted in three documents; **this is the only thing that verifies it**, and it does so through the role the API actually uses rather than through the owner.

CI role passwords are literals in the workflow. That is deliberate and safe: they exist for the lifetime of one ephemeral container, are never used by a deployed environment, and are not secrets. The secret scanner's allow-list does not exempt them — they are in a workflow file under `.github/`, which is scanned; they avoid the credential pattern by not looking like one.

---

## 3. `android.yml`

Runs only when `apps/android/**` changes. JDK 21 Temurin, Gradle via `gradle/actions/setup-gradle`, then:

1. `./gradlew test` — localization parity and the `supportsRtl` assertion
2. `./gradlew assembleDebug`
3. Upload the debug APK, 14-day retention

**No emulator job.** Emulator jobs need nested virtualization, are slow and flaky, and the checks that matter here — string parity and `supportsRtl` — are verifiable on the JVM.

**On-device RTL verification is a manual gate before release and is NOT claimed to be covered by this workflow.**

---

## 4. Required status checks

To be enabled with branch protection after the first push: `guards`, `node`, `database`, and `Android / build` when Android files change.

---

## 5. CD — deliberately absent

**Gate D defers paid staging infrastructure to Stage 5B.** No deployment workflow exists, and none should:

- No provider has been selected — Stage 4 ADR-016 leaves region open pending **OD-019**
- No environment exists to deploy to
- A deployment workflow with placeholder targets is worse than none: it looks ready and fails on first use

`infrastructure/staging/` and `infrastructure/production/` exist as empty placeholders carrying the deferral notice.

**Deployment strategy is already decided** (Stage 4 §14) and needs no rework: rolling restart with health checks, no blue-green. NFR-AVAIL-001 permits ~7 hours of monthly downtime, and rollback is redeploying the previous artefact — one action.

---

## 6. Dependabot

Weekly, **grouped** — production and development separately for npm, plus Gradle and GitHub Actions. Ungrouped daily PRs would drown a two-person team and get ignored, which is worse than a slower cadence that is actually reviewed.
