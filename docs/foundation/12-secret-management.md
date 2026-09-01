# 12 — Secret Management

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**


---

## 1. Rules

1. **No secret is ever committed.** Enforced by `.gitignore`, a CI secret-scan job, and a pre-push scan.
2. **No secret has a default value** in any configuration schema.
3. **No secret is printed.** Validation errors name the field, never the value.
4. **Deployed secrets live in the hosting provider's secret store**, never in a file in the repository, never in a chat message, never in an issue.
5. **A running application holds only the credentials it needs** — `runtime_app`, never the owner, never `migration_owner`.

---

## 2. What blocks a secret from being committed

**`.gitignore`** — verified with `git check-ignore`, not assumed:

| Path | Result |
|---|---|
| `.env` | IGNORED |
| `apps/api/.env.production` | IGNORED |
| `secrets/db.key` | IGNORED |
| `config/google-services.json` | IGNORED |
| `.env.example` | **tracked** ✅ correct |

Also blocked: `*.pem`, `*.key`, `*.p12`, `*.jks`, `*.keystore`, `*serviceAccount*.json`.

**`scripts/posix/check-secrets.mjs`** — scans git-tracked files for private key blocks, AWS/GitHub/Google/Slack token shapes, service-account JSON, and generic `password: "…"` assignments. A tracked `.env` is a finding on its own, regardless of contents.

It has a deliberate allow-list (`CHANGE_ME`, `mohalla_local_dev_only`, `example.com`) so the template does not trip it. **If a finding is a false positive, the pattern is narrowed — the check is not deleted.** That instruction is in the script itself.

> **Limitation, stated plainly.** This is a cheap high-signal net, not a replacement for provider-side secret scanning and push protection. Both should be enabled on the GitHub repository once it exists. And a scan run **before the first `git add`** proves nothing — `git ls-files` is empty then.

---

## 3. Secret inventory

| Secret | Environment | Held in | Rotation |
|---|---|---|---|
| `runtime_app` password | all | provider secret store | On suspicion; low blast radius |
| `runtime_worker` password | all | provider secret store | Same |
| `migration_owner` password | CI + a human | CI secret; not in app config | On suspicion |
| Cluster owner password | one human | password manager | ⚠️ Also the emergency audit-mutation capability — see §5 |
| `read_only_support` password | support tooling | provider secret store | On staff change |
| SMS API key | staging, production | provider secret store | Per provider policy |
| Object storage keys | staging, production | provider secret store | Per provider policy |
| FCM service account JSON | staging, production | provider secret store | Per Google policy |
| **`IDENTIFIER_HASH_PEPPER`** | production | provider secret store, **one copy** | ⚠️ **Never** — see §4 |
| **`IP_HASH_PEPPER`** | production | provider secret store, **one copy** | ⚠️ Rotating orphans historical audit correlation |
| Android release keystore | release only | **outside the repository**, backed up offline | Never — losing it means the app cannot be updated on Play |

---

## 4. The peppers are not rotatable

`IDENTIFIER_HASH_PEPPER` keys the ban list. Banned identifiers are stored as **peppered hashes** so that a raw phone number is never retained for enforcement — the data-minimisation resolution recorded in Stage 4.

**Rotating the pepper makes every existing hash unmatchable, silently unbanning every banned user** (BR-036), with no error and no log entry.

Consequences:
- Generated **once**, before the first production user
- **One copy**, in the provider secret store
- Losing it is equivalent to losing the ban list — and the ban list cannot be reconstructed, because the raw identifiers were deliberately never kept
- Any future rotation is a **product decision with a data-migration plan**, not an operational routine

This is the most consequential secret in the system and it is the one most likely to be rotated by reflex during an unrelated incident. It is documented here for that reason.

---

## 5. The credential that can mutate the audit log

The audit log is append-only and protected from mutation **by application and administrator roles**. It is **not** protected from the infrastructure owner — a superuser or the managed provider's owner credential retains an emergency capability to alter any table.

That capability is deliberate; there must be a route to repair a corrupted database. It means **audit integrity depends partly on an operational control**:

- The cluster owner credential is held by **one named person** — **blocked on OD-020**
- It is not stored in any application environment, CI secret, or shared store
- Its use is exceptional and should itself be recorded outside the database

Claiming the log is "immutable" would be false. This is what is actually true.

---

## 6. OD-020 blocks secret ownership

**No technical owner has been named.** Until Shehersaaz does:

- No production secret can be assigned an owner
- The cluster owner credential has no designated holder
- `CODEOWNERS` holds a placeholder, not a real handle
- **No administrator account is created** — the provisioning CLI is built, but no bootstrap endpoint exists and none should

This blocks release, not Stage 5.
