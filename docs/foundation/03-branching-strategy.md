# 03 — Branching Strategy

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**


---

## 1. Trunk-based, with short-lived branches

`main` is the only long-lived branch. Everything else lives for days, not weeks.

```
main ──●────●────●────●────●──►
        \    /     \    /
         ●──●       ●──●
      feat/…     fix/…
```

**Why not Git Flow.** Git Flow's `develop`/`release`/`hotfix` structure exists to coordinate many teams shipping on independent cadences. This is **two developers on a 68-working-day schedule (OD-011)**. A parallel `develop` branch would double merge work and add a class of bug — "fixed on develop, not on main" — that costs more than the release isolation is worth at this size.

---

## 2. Branch naming

| Prefix | For | Example |
|---|---|---|
| `feat/` | New requirement | `feat/auth-fr-001-phone-registration` |
| `fix/` | Defect | `fix/rtl-comment-thread-indent` |
| `chore/` | Tooling, dependencies, CI | `chore/bump-compose-bom` |
| `docs/` | Documentation only | `docs/epic-03-notes` |
| `refactor/` | Behaviour-preserving change | `refactor/extract-visibility-policy` |

**Include the requirement ID where one exists.** With 124 FRs and two developers, a branch named `feat/login` is ambiguous six weeks later; `feat/auth-fr-001-phone-registration` is not.

---

## 3. Rules

1. **Never commit directly to `main`.** Enforced by branch protection.
2. **One pull request, one concern.** A PR that fixes a bug *and* renames a folder cannot be reviewed properly or reverted cleanly.
3. **Rebase onto `main` before requesting review** — linear history is required.
4. **Squash merge.** One commit per PR on `main`, so `git revert` is one action.
5. **Delete the branch after merge.**
6. **A red build is the highest-priority work in the project.** Fix or revert; do not merge past it.

---

## 4. Commit messages

```
<type>(<scope>): <what changed>

<why, if not obvious>

Refs: AUTH-FR-001
```

`type` matches the branch prefixes. `scope` is the module or app — `identity`, `admin`, `android`, `db`.

```
feat(identity): reject registration when phone is on the ban list

Ban enforcement is keyed on the peppered identifier hash so the raw
number is never stored for this purpose (BR-036, OD-021 Option C).

Refs: AUTH-FR-002
```

---

## 5. Releases

**Not yet applicable.** No release process is defined in Stage 5 because there is nothing to release — no feature exists. Versioning and tagging are established in the epic that produces the first shippable build, and staging deployment is **deferred to Stage 5B** by Gate D.

What Stage 5 does fix: `main` is always the deployable trunk, and history is linear so any commit can be identified and reverted.
