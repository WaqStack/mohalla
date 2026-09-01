# Production Infrastructure

# 🛑 NOT PROVISIONED

Production comes after staging, and **staging provisioning is deferred to Stage 5B**.

Production additionally requires, and does not yet have:

- **OD-015** — Terms, Privacy Policy and Community Guidelines, both languages, publicly
  reachable. Google Play rejects submission without a live Privacy Policy URL (PRIV-017)
- **OD-016** — ~400 Urdu strings (DEP-011)
- **OD-018** — seed content and accounts (DEP-014)
- **OD-020** — a named technical owner, without which there is no route to the first
  administrator account
- **DEP-002** — an SMS provider selected after Pakistani network coverage testing

Nothing here should be created until staging has run and been rehearsed, including
rollback and restore.
