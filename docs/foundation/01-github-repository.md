# 01 — GitHub Repository

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Status: **PROPOSAL — awaiting explicit confirmation** · updated 2 September 2026

---

## 1. Nothing has been created

**No GitHub repository exists. No remote has been added. Nothing has been pushed.**

```
$ git remote -v
(no output)
```

Creating a repository on GitHub is an **external action** under the Stage 5 authorisation rules, and Gate C requires the proposal to be presented and confirmed first. This document **is** that proposal. It is not a record of something done.

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

## 6. Confirmation required

**Nothing in this document has been executed.** On explicit confirmation, and only then:

1. Create the private repository with the settings in §2
2. `git remote add origin …`
3. Re-run the secret scan against the populated index
4. Push `main`
5. Apply the branch protection in §4, minus the two items OD-020 blocks
6. Report the result, including anything that failed

**If any part of §2 is wrong — the name, the owner, the visibility — say so and it changes before anything is created.**
