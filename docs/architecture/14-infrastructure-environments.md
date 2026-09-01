# 14 — Infrastructure, Environments, CI/CD

**Stage 4 · Shehersaaz Community Platform** · Version 1.1 · Status: **Complete**
**Diagram:** `deployment.mmd` · **Decisions:** ADR-016, ADR-015

> 🟦 **REQUIREMENT** approved · 🟩 **ARCHITECTURE** decision · 🟨 **PROPOSED DEFAULT** changeable · 🟥 **PROPOSED PRODUCT CHANGE** not approved

---

## 1. Environments

| | Development | Staging | Production |
|---|---|---|---|
| Purpose | Local feature work | **Full Urdu/RTL and prototype-flow validation**; restore rehearsal | Live |
| API | localhost | staging host | production host |
| Database | Local PostgreSQL | Managed, separate instance | Managed, backed up |
| Storage | Local S3-compatible or a dev bucket | Separate bucket | Production bucket + CDN |
| Push | Separate FCM project | Separate FCM project | Production FCM project |
| **SMS** | 🟦 **Sandbox / allowlist only** | Sandbox or a tiny live allowlist | Live provider |
| Email | Sandbox | Sandbox | Live (only if OD-021 retains AUTH-FR-004) |
| Secrets | `.env` from `.env.example`, **values never committed** | Platform secret store | Platform secret store |
| Admin accounts | Seeded test admins | Seeded test admins | 🟦 **Provisioned by the technical owner only** (S2-CR-005) |
| Seed data | Full synthetic dataset | Full synthetic dataset | 🟦 **Real seed content before launch** (DEP-014, OD-018) |
| Logging | Verbose | Production-like | Production, redacted |
| Backups | None | Weekly | 🟦 **Daily, separate location, restore tested** (SEC-026) |

🟦 **Rules that are not negotiable**
- **Production data is never copied into development or staging.** Staging uses synthetic data.
- **Production secrets never appear in source control.** `.env.example` carries names only, never values (SEC-025).
- **Development SMS uses a sandbox or a controlled allowlist** — a bug must not send real messages or spend real money (RSK-007).
- **Staging must support full Urdu, RTL and every prototype flow**, because REL-002 and REL-008 are validated there before production.

---

## 2. Deployment topology

🟩 ADR-016 — managed PaaS, managed PostgreSQL, S3-compatible storage, CDN. **Provider and region deliberately deferred** until latency from Pakistani networks is measured and OD-019 answers data residency.

**Launch:** one API instance (REST + Socket.IO) · one worker · one managed PostgreSQL with daily backup and PITR · object storage + CDN · FCM · error tracking and uptime monitoring.

**Growth:** vertical first. Then the triggers in `03` §6 — the realtime thresholds in ADR-009 are the only ones that introduce Redis.

🟩 **Zero-downtime is not attempted, and that is deliberate.** 🟦 NFR-AVAIL-001 permits ~7 hours of monthly downtime. A rolling restart with health checks is sufficient and far simpler than blue-green for a two-person team. Rollback is redeploying the previous artefact — one action.

---

## 3. Repository

🟩 ADR-015 — monorepo.

```
apps/      mobile/ (Gradle) · api/ · worker/ · admin/
packages/  contracts/ · design-tokens/ · localization/ · validation/
docs/      product/ requirements/ design/ architecture/
infra/     migrations/ · env templates · CI workflows
```

🟩 **Design tokens and validation rules are generated into both languages from one source**, so a token or a field limit cannot drift between API, app and admin (NFR-MAIN-002).

Two CI lanes — Node and Gradle — with path filters so an app-only change does not run API tests.

---

## 4. CI/CD

| Stage | Gate |
|---|---|
| Feature branch | Formatting · static analysis · type check |
| Pull request | Unit · domain · integration · contract tests · **dependency and secret scan** · **architecture-conformance check** (module direction, no cycles) · **`audit_log` grant check** · **missing-Urdu-key check** |
| **Human review** | 🟦 **Mandatory. No merge without it** |
| Merge to main | Build artefacts |
| Staging deploy | Automatic · migrations run · smoke tests · **RTL screenshot pass** |
| **Production deploy** | 🟦 **Explicit human approval** |
| Post-deploy | Health checks · error-rate watch · rollback available |

### 🟦 What no AI agent may do

**Push directly to main · deploy to production · rotate secrets · run destructive production migrations · create administrator accounts · change security rules without human review.**

Enforced by branch protection, CODEOWNERS on security-sensitive paths, and production deployment requiring a human approval step no automation can satisfy.

---

## 5. Migrations

🟩 One tool, forward-only, checked into the repository.

- `migration_owner` runs them; **the runtime never holds that credential**
- 🟦 **No manual production schema change, ever**
- Every migration is **human-reviewed** — a mandatory gate
- Destructive migrations require a verified backup immediately beforehand (SEC-026)
- Forward-compatible: deploy schema, then code, then remove the old path
- Schema-drift detection on every deploy
- **A CI check asserts the `audit_log` grants remain revoked** so a future migration cannot silently restore them

---

## 6. Dependencies with owners

| ID | Dependency | Owner | Blocks |
|---|---|---|---|
| DEP-002 | **SMS/OTP provider** | Shehersaaz + technical owner | 🟦 **Registration — the single blocking external dependency** |
| DEP-003 | FCM | Technical owner | Retention |
| DEP-004 | Object storage | Technical owner | All media |
| DEP-005 | Hosting | Technical owner | Everything |
| DEP-006 | **Google Play account** | Shehersaaz | 🟦 **Release** |
| DEP-007 | Domain + TLS | Shehersaaz | Release |
| DEP-008 | **Policy documents** | Shehersaaz | 🟦 **Release — OD-015** |
| DEP-010 | 3 physical Android devices | Shehersaaz | REL-008 |
| DEP-011 | **~400 Urdu strings** | Shehersaaz | 🟦 **Release — REL-002** |
| DEP-012 | Category list, both languages | Shehersaaz | Development |
| DEP-013 | Urdu typeface licence | Technical owner | LOCALE-FR-004 |
| DEP-014 | **Seed content** | Shehersaaz | 🟦 **Launch — RSK-001, OD-018** |
| DEP-015 | Crash reporting | Technical owner | NFR-OBS-002 |
| DEP-016 | **Named technical owner** | Shehersaaz | 🟦 **Release — OD-020** |
