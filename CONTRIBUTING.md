# Contributing

**Mohalla — Shehersaaz Community Platform** · Private repository

---

## Before anything else

Read [DEVELOPMENT.md](DEVELOPMENT.md). Then understand two constraints that shape almost every change:

1. **Urdu is a peer language, not a translation layer.** Both languages, always, and the layout mirrors.
2. **The audit log is append-only.** The application cannot change it, by database privilege.

---

## Branching

`main` is protected. Work on a short-lived branch and open a pull request.

```
feat/auth-fr-001-phone-registration
fix/rtl-comment-thread-indent
chore/bump-compose-bom
docs/epic-03-notes
refactor/extract-visibility-policy
```

**Include the requirement ID.** With 124 FRs, `feat/login` is ambiguous six weeks later.

Full strategy: [`docs/foundation/03-branching-strategy.md`](docs/foundation/03-branching-strategy.md).

---

## Commits

```
<type>(<scope>): <what changed>

<why, if not obvious>

Refs: AUTH-FR-001
```

---

## Pull requests

**One PR, one concern.** A PR that fixes a bug *and* renames a folder cannot be reviewed properly or reverted cleanly.

The template checklist is not decoration — every item maps to a rule the build or a reviewer enforces.

Before requesting review:

```bash
npm run guard:all
npm run lint
npm run build
```

Rebase onto `main` — linear history is required. Squash merge. Delete the branch.

---

## What reviewers will check

| Area | Question |
|---|---|
| **Architecture** | Does any import cross a tier upward? Is a business rule sitting in a controller? |
| **Transactions** | Is the boundary in the application service? Does an admin action emit audit in the same transaction? |
| **Bilingual** | Does every new string exist in `en` **and** `ur`? |
| **RTL** | Logical properties only? Was it checked in Urdu? |
| **Privacy** | Any identifier in a public projection or in `audit_log.metadata`? |
| **Blocking** | Does every read path returning user content compose the block predicate? |
| **Tests** | Does a test exist that fails without this change? |

---

## Things that will be rejected

- A physical CSS side — the lint rule catches it first
- A new string in English only
- An import that crosses a tier upward
- A business rule in a controller
- A secret in a tracked file, including a "temporary" one
- An `UPDATE` against `audit_log` — the database refuses it anyway
- A change to any Stage 1–4 document in `docs/` — **those are approved historical records.** Record the correction in a Stage 5 document instead
- A guard weakened or disabled to make a build pass

**If a guard is wrong, narrow it and explain why in the PR.** Do not delete it.

---

## A red build is the highest-priority work in the project

Fix it or revert it. Do not merge past it, and do not add a second failure on top of the first.
