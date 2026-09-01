# Staging Infrastructure

# 🛑 STAGING PROVISIONING: DEFERRED — STAGE 5B

**No paid infrastructure has been provisioned. No hosting account exists. No provider
has been selected. Nothing has been deployed.**

Gate D of the Stage 5 authorisation defers this explicitly.

## Why the deferral is correct, beyond the instruction

Provisioning now would mean choosing a region before **OD-019** (the Pakistani
regulatory position) is resolved. That risks placing citizens' personal data in a
legally wrong jurisdiction and paying to migrate it later.

**OD-020** — the named technical owner — is also open, so there is nobody to hold the
account, the billing relationship, or the secrets.

## What is already prepared

- Environment variable contract — `docs/foundation/10-environment-variables.md`
- Secret inventory and ownership — `docs/foundation/12-secret-management.md`
- Database roles — `packages/db/roles/roles.sql`
- Forward-only migrations — `packages/db/migrations/`
- Health endpoints for the load balancer — `GET /health/live`, `GET /health/ready`
- Graceful shutdown, required by the rolling-restart strategy
- Rollback procedure — `docs/foundation/14-staging-deployment.md`

## Stage 5B checklist

See `docs/foundation/14-staging-deployment.md` §6.
