# 14 — Staging Deployment

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**


---

# 🛑 STAGING PROVISIONING: DEFERRED — STAGE 5B

**No paid infrastructure has been provisioned. No hosting account has been created. No provider has been selected. Nothing has been deployed.**

Gate D defers this explicitly:

> *"Do NOT provision paid staging infrastructure yet."*

---

## 1. What this document is

A record of what is decided, what is prepared, and what is deliberately not done — so that Stage 5B is a provisioning exercise rather than a design exercise.

---

## 2. Already decided in Stage 4 — no rework needed

| Decision | Source |
|---|---|
| Managed PaaS, not Kubernetes | ADR-016 |
| Rolling restart with health checks; **no blue-green** | Stage 4 §14 |
| Rollback = redeploy the previous artefact, one action | Stage 4 §14 |
| Zero-downtime **not attempted** — NFR-AVAIL-001 permits ~7 h monthly downtime | Stage 4 §14 |
| Managed PostgreSQL 18, provider-managed backups | ADR-016 |
| S3-compatible object storage + CDN | ADR-013 |
| Three environments: development · staging · production | Stage 4 §14 |

**Rolling restart is right for this team.** Blue-green doubles infrastructure cost and adds a database-compatibility constraint on every migration, to buy availability the requirements do not ask for.

---

## 3. What is prepared

| Prepared | Location |
|---|---|
| Environment variable contract | [`10-environment-variables.md`](10-environment-variables.md), `.env.example` |
| Secret inventory and ownership | [`12-secret-management.md`](12-secret-management.md) |
| Four database roles + grants | `packages/db/roles/roles.sql` |
| Forward-only migrations | `packages/db/migrations/` |
| Health endpoints for the load balancer | `GET /health/live`, `GET /health/ready` |
| Graceful shutdown for rolling restart | API shutdown hooks; worker `SIGTERM` drain |
| Placeholder directories | `infrastructure/staging/`, `infrastructure/production/` |

---

## 4. Blocked by open decisions

| Decision | Blocks | Owner |
|---|---|---|
| **OD-019** — Pakistani regulatory position | **Region selection.** Data residency, retention and breach-notification obligations are unresolved. Any region chosen now is provisional and possibly wrong | Shehersaaz |
| **OD-020** — named technical owner | Account ownership, billing, secret custody, **the first administrator account** | Shehersaaz |
| **DEP-002** — SMS provider | Cannot be selected before Pakistani network coverage testing. **RSK-007 now rests entirely on this**, since OD-021 Option C removed email registration as a mitigation | Shehersaaz |

**Provisioning before OD-019 resolves risks putting citizens' personal data in a legally wrong jurisdiction and paying to migrate it later.** That is the substantive reason the deferral is correct, beyond the instruction.

---

## 5. Rollback procedure — written now, rehearsed in 5B

1. Identify the last known-good deployment ID
2. Redeploy that artefact — one action
3. Confirm `/health/ready` returns `200` on every instance
4. **Do not roll the database back.** Migrations are forward-only (ADR-008). A schema problem is fixed by a new forward migration
5. Record what happened in the audit trail

**Backup / restore rehearsal has NOT been performed** and cannot be until a database exists. It is a Stage 5B deliverable, and a restore that has never been rehearsed is a hope rather than a plan.

---

## 6. Stage 5B checklist

- [ ] OD-019 resolved → region selected
- [ ] OD-020 resolved → owner named, accounts and billing in their name
- [ ] Provider selected after latency measurement from Pakistan
- [ ] Managed PostgreSQL 18 provisioned; UUIDv7 strategy confirmed via `platform_meta`
- [ ] Four roles created; **audit mutation-denial test run against the real instance**
- [ ] Secrets loaded into the provider store; **peppers generated once**
- [ ] Staging deployed; health checks green
- [ ] **Rollback rehearsed**
- [ ] **Backup and restore rehearsed**
- [ ] Argon2id parameters benchmarked on the chosen host and recorded
