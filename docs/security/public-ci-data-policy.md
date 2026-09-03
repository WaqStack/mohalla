# Public CI Data Policy

**Per addendum §12, §13, §31.** Anyone can read this repository's workflow logs and download
its artifacts.

---

## Artifacts — never upload

`.env` files · service-account files · credentials of any kind · database dumps · PostgreSQL
data directories · private keys · signing keystores · production-signed APKs · production
configuration · unredacted logs · request/response bodies containing private data · private
messages · screenshots containing real personal data · internal incident reports.

## Artifacts — allowed

Redacted test summaries · coverage reports over **synthetic** data · lint results · sanitized
build reports · **unsigned / development-only** build outputs.

**Currently produced:** exactly one — the **unsigned debug APK** from `android.yml`, retention
**14 days**. It is built from public source with no signing config and no secrets. Nothing else
is uploaded.

Use the **shortest practical retention**.

## The CI database (§31)

| Requirement | How it is met |
|---|---|
| Isolated and disposable | `postgres:18` **service container**, created and destroyed per job |
| Synthetic credentials | `ci_*` values defined inline in the workflow; used nowhere else |
| Least-privileged runtime roles | The four-role model is applied; tests connect as `runtime_app` / `read_only_support`, never as owner |
| Automatic cleanup | The container dies with the job |
| Never connected to a real database | ✅ no developer, office, staging or production database is reachable from CI |
| Database dump never uploaded | ✅ no dump artifact exists |

## Caches (§13)

Caches hold only npm and Gradle dependency downloads. **No secret, credential or personal value
is cached, and no cache key contains one.** Caches restored into fork-PR jobs are treated as
untrusted; no privileged cache exists because no job is privileged.

## Logs (§25)

Workflow logs are public. Redaction rules are in
[`logging-redaction-policy.md`](logging-redaction-policy.md). CI must not print connection
strings, tokens or personal values — the API's env validator prints **field names only**, never
values, for exactly this reason.
