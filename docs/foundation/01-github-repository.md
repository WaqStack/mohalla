# 01 — GitHub Repository

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Status: ✅ **CREATED AND PUSHED** · 3 September 2026 · authorised by the owner in chat

---

## 1. Created — record of what was done

The owner authorised creation under their **personal account `waqaskhan0`** and it was carried out.

| Field | Actual |
|---|---|
| **URL** | https://github.com/waqaskhan0/mohalla |
| **Visibility** | 🔒 **PRIVATE** (verified `isPrivate: true`) |
| **Default branch** | `main` |
| **Push** | `main` pushed; remote HEAD matches local exactly |
| **Auth** | `gh` CLI, owner-authenticated (`gh auth login`) — the assistant never handled the credential |
| **Secret scan before push** | ✅ 266 tracked files, 0 findings |
| **CI on first push** | ✅ **all 4 jobs green** — guards, node build/test, database (migrations + roles + audit + queue round-trip), security scan |
| **Dependabot** | opened dependency-bump PRs automatically (espresso, AGP, kotlinx-coroutines) |

> This section was the proposal before creation; it is now the record. The commands used were
> `gh repo create waqaskhan0/mohalla --private --source . --remote origin` then `git push -u origin main`.

### ⚠️ Branch protection — BLOCKED by the GitHub plan, not applied

Branch protection **could not be applied**. Both the classic branch-protection API and repository
**rulesets** return:

> *"Upgrade to GitHub Pro or make this repository public to enable this feature."*

On a **free personal account, a private repo gets no branch protection or rulesets.** The private
decision stands on its security rationale (§3 originally), so **the repo was NOT made public to
unlock protection.** Options, none blocking development:

1. **GitHub Pro** on the account — unlocks rulesets/branch protection for private repos.
2. **Move the repo into a GitHub organisation** — free orgs get rulesets on private repos.
3. Until then, the PR-review discipline in [`03-branching-strategy.md`](03-branching-strategy.md) is
   convention-enforced, and **CI still runs on every push and PR** — it simply cannot yet be made a
   *required* gate.

The intended protection (1 approval, dismiss-stale, linear history, no force-push/deletion, admins
included; Code-Owner review and signed commits deferred on OD-020) is recorded in §4 for whenever a
plan or org makes it available.

---

## 2. Proposal

| Field | Proposed value |
|---|---|
| **Repository name** | `mohalla` |
| **Owner** | The Shehersaaz GitHub organisation, or the technical owner's account if no organisation exists yet |
| **Visibility** | 🔒 **PRIVATE** |
| **Default branch** | `main` |
| **Description** | Shehersaaz Community Platform (Mohalla) — bilingual civic community platform for Pakistan |
| **Initialise with README** | **No** — the local repository already has one; letting GitHub create one produces an unrelated-histories conflict |
| **`.gitignore` / licence template** | **No** — both already exist locally |

### Why private

The repository contains the complete architecture of a platform that will hold Pakistani citizens' phone numbers, private messages and safety reports. It documents the exact structure of the ban list, the audit privilege model and the anti-enumeration behaviour. **Publishing that before launch hands an attacker the design.** There is no offsetting benefit — this is not an open-source project seeking contributors.

---

## 3. What the first push would contain

The complete Stage 5 foundation and the frozen Stage 1–4 documentation. **No product feature.**

| Area | Contents |
|---|---|
| `docs/` | Stages 1–4 approved artefacts (63 files) + Stage 5 foundation documents |
| `apps/api/` | NestJS foundation — 2 health routes, 17 empty module shells |
| `apps/worker/` | pg-boss worker — `FOUNDATION_HEALTH_JOB` only |
| `apps/admin/` | Next.js foundation — one page proving build and RTL mirroring |
| `apps/android/` | Kotlin/Compose foundation — one screen, runtime en↔ur switch, Gradle wrapper pinned by SHA-256 |
| `packages/` | contracts · validation · design-tokens · localization · db · config · eslint-plugin |
| `infrastructure/` | Docker Compose (PostgreSQL 18, verified running), staging placeholders |
| `scripts/` | guards, smoke test, `verify`, dev scripts |
| `.github/` | CI workflows, CODEOWNERS, templates, dependabot |

**Snapshot at proposal time:** `main`, **5 commits**, **266 tracked files**, **0 remotes**. The
last commit's tree is fully verified — `npm run smoke` 8/8 and `npm run verify` 10/10 executable
lanes against a live PostgreSQL 18.6 / pg-boss / Socket.IO stack.

### Secret-scan confirmation

`node scripts/posix/check-secrets.mjs` is run against **git-tracked files** immediately before any push, and it is a CI job on every push and pull request thereafter.

**It must be re-run after the first `git add`.** Before the first commit `git ls-files` is empty, so a clean result at that point proves nothing — a fact recorded here rather than glossed over. The result that counts is the one taken against a populated index, and it is reported in [`15-stage-5-validation.md`](15-stage-5-validation.md).

Independently verified at audit time:
- No `.env` file exists anywhere in the tree
- No `*.pem`, `*.key`, `*.jks`, `*.keystore` or `*serviceAccount*.json` exists
- `.env.example` contains only `CHANGE_ME` placeholders and one local-only development password
- The Android project has **no signing configuration** and no keystore

---

## 4. Branch protection — to apply after the first push

`main` is the only long-lived branch, so it carries all the protection.

| Setting | Value | Why |
|---|---|---|
| Require a pull request before merging | ✅ | No direct pushes to `main` |
| Required approvals | **1** | Two developers; two would deadlock |
| Dismiss stale approvals on new commits | ✅ | An approval must apply to the code being merged |
| Require review from Code Owners | ⚠️ **Deferred** | **Blocked by OD-020** — `CODEOWNERS` holds a placeholder, not a real handle. Enabling this now would make `main` unmergeable |
| Require status checks to pass | ✅ | `guards`, `node`, `database`, and `Android / build` when Android files change |
| Require branches up to date before merging | ✅ | Prevents semantic conflicts that both branches pass individually |
| Require conversation resolution | ✅ | |
| Require linear history | ✅ | Squash merges only |
| Require signed commits | ⚠️ **Recommended, not yet required** | Enable once both developers have signing keys; requiring it first blocks all work |
| Allow force pushes | ❌ **Never** | |
| Allow deletions | ❌ **Never** | |
| Include administrators | ✅ | A rule an administrator can bypass is a convention |

> **OD-020 blocks two items above.** Neither is a design gap; both are one configuration change once Shehersaaz names the technical owner.

---

## 5. What is explicitly NOT proposed

- ❌ Making the repository public
- ❌ Adding collaborators — that is the owner's decision, not a foundation decision
- ❌ GitHub Pages, Discussions, or a public issue tracker
- ❌ Any deployment integration — Gate D defers paid infrastructure to **Stage 5B**
- ❌ Storing any secret in GitHub Actions secrets yet — there is nothing to deploy to

---

## 6. Outcome

**Done, 3 September 2026.** Repository created private under `waqaskhan0`, `main` pushed, first CI run
green across all four jobs. The one item not completed is **branch protection**, blocked by the free
plan on a private repo (§1) — a plan upgrade or an organisation unlocks it, and neither blocks feature
development. The GitHub remote line item of Stage 5 is therefore **complete**, with branch protection
recorded as a follow-up.
