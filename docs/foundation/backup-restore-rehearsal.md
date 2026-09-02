# Backup / Restore Rehearsal

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Status: 🛑 **NOT EXECUTED — BLOCKED (no database)** · Scripts ready · 2 September 2026

---

## 1. Honest status

**No backup has been taken and no restore has been rehearsed.** Both require a running
PostgreSQL, which this workstation cannot provide until Docker is unblocked
([`WINDOWS-ADMIN-SETUP.md`](WINDOWS-ADMIN-SETUP.md)).

What exists now: the scripts, the guard rails, and the exact procedure below. A restore
that has never been rehearsed is a hope, not a plan — so this document does **not** claim
the rehearsal is done.

---

## 2. The scripts (authored, syntax-checked, not executed against a database)

| Script | Command | What it does |
|---|---|---|
| `packages/db/scripts/backup.mjs` | `npm run backup --workspace @mohalla/db` | `pg_dump --format=custom` to `.backups/mohalla-<timestamp>.dump` |
| `packages/db/scripts/restore.mjs` | `npm run restore --workspace @mohalla/db -- <dump>` | `pg_restore` into `RESTORE_TARGET_URL` |
| `packages/db/scripts/reset.mjs` | `npm run reset --workspace @mohalla/db` | Drops and recreates the local schema |

### Guard rails, because these are destructive

- **backup** runs as an owner (`ADMIN_DATABASE_URL` / `MIGRATION_DATABASE_URL`), never as
  `runtime_app` — a backup must see every object. Custom format so `pg_restore` can be
  selective.
- **restore** requires an explicit `RESTORE_TARGET_URL` and **refuses when it equals
  `ADMIN_DATABASE_URL`** — a rehearsal cannot overwrite the primary by accident.
- **reset** requires all three of: `NODE_ENV` ≠ `production`, host is localhost, and
  `ALLOW_DB_RESET=yes`. It is effectively impossible to point it at a shared database.

---

## 3. The rehearsal procedure — to run once Docker is available

```bash
# 1. Fresh local database
npm run infra:up
npm run db:roles
npm run db:migrate

# 2. Seed a known, checkable marker (foundation data only - no product tables exist)
psql "$ADMIN_DATABASE_URL" -c \
  "INSERT INTO audit_log (id, actor_type, action, entity_type, metadata)
   VALUES (gen_random_uuid(), 'SYSTEM', 'rehearsal.marker', 'test',
           '{\"rehearsal\":\"pre-backup\"}');"

# 3. Back up
DUMP=$(npm run --silent backup --workspace @mohalla/db)
echo "backup written: $DUMP"

# 4. Restore into an ISOLATED target database, never the primary
createdb -h 127.0.0.1 -U mohalla_owner mohalla_restore_check
RESTORE_TARGET_URL="postgres://mohalla_owner:...@127.0.0.1:5432/mohalla_restore_check" \
  npm run restore --workspace @mohalla/db -- "$DUMP"

# 5. Integrity checks against the RESTORED database
psql "$RESTORE_TARGET_URL" -c "SELECT count(*) FROM audit_log WHERE action='rehearsal.marker';"   # expect 1
psql "$RESTORE_TARGET_URL" -c "SELECT value FROM platform_meta WHERE key='uuid_strategy';"          # expect a strategy
psql "$RESTORE_TARGET_URL" -c "\d+ audit_log"                                                        # triggers present?

# 6. Prove the append-only protection SURVIVED the restore
#    (connect as runtime_app against the restored DB; UPDATE must be refused)
RUNTIME_APP_DATABASE_URL="postgres://runtime_app:...@127.0.0.1:5432/mohalla_restore_check" \
  npm run test --workspace @mohalla/db

# 7. Point the API at the restored DB and confirm health
DATABASE_URL="$RESTORE_TARGET_URL" npm run start --workspace @mohalla/api &
curl -fsS http://127.0.0.1:3000/health/ready

# 8. Clean up
dropdb -h 127.0.0.1 -U mohalla_owner mohalla_restore_check
```

### Step 6 is the one most rehearsals skip

A restore that brings the rows back but **loses the audit triggers and grants** is a
silent security regression — the audit log would no longer be append-only on the restored
database. The rehearsal therefore re-runs the role/audit privilege test against the
restored database, not just a row count.

---

## 4. Pass criteria

The rehearsal **passes** only when **all** hold on the restored database:

- [ ] The seeded marker row is present exactly once
- [ ] `platform_meta.uuid_strategy` restored
- [ ] `audit_log` mutation-denial triggers present
- [ ] `runtime_app` is refused `UPDATE`/`DELETE`/`TRUNCATE` on `audit_log`
- [ ] `read_only_support` cannot write
- [ ] API `/health/ready` returns `200` against the restored database

Any unchecked box = **NOT PASS**. No partial credit.

---

## 5. Production note

In production the managed provider's automated backups are authoritative (ADR-016). This
rehearsal exists so the **restore path is exercised** before it is ever needed in anger —
an untested backup is indistinguishable from no backup. Rehearsing restore, including the
privilege re-check, is a **Stage 5B** deliverable once a database exists.
