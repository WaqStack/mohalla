# GitHub Actions Inventory

**Per addendum §11.** Every external action in use, reviewed. Verified 3 September 2026.

---

## In use

| Action | Owner | Purpose | Pin | Permissions | Network | Trust rationale |
|---|---|---|---|---|---|---|
| `actions/checkout@v5` | **GitHub** | Clone the repository | major tag `v5` | inherits `contents: read` | fetches this repo only | First-party, GitHub-maintained |
| `actions/setup-node@v5` | **GitHub** | Install pinned Node 24.20.0 + npm cache | major tag `v5` | inherits read | npm registry, Actions cache | First-party |
| `actions/setup-java@v5` | **GitHub** | Install Temurin JDK 21 | major tag `v5` | inherits read | Adoptium | First-party |
| `actions/upload-artifact@v5` | **GitHub** | Upload the **unsigned debug APK** | major tag `v5` | inherits read | Actions artifact store | First-party. Artifact contents governed by [`public-ci-data-policy.md`](public-ci-data-policy.md) |
| `gradle/actions/setup-gradle@v4` | **Gradle Inc.** | Gradle distribution + dependency cache | major tag `v4` | inherits read | Gradle distribution, Maven Central | **Only non-GitHub action.** Maintained by the Gradle team; the canonical action for Gradle builds. The wrapper it runs is itself **SHA-256 pinned** in `gradle-wrapper.properties`, so a substituted distribution fails the build |

**Managed by GitHub, no workflow file:** CodeQL **default setup** (code scanning). Configured
through repository settings rather than a committed workflow, so there is no third-party action
to review for it.

## Policy

- **Minimum count.** Five actions, four of them first-party. No action was added to avoid
  writing a small transparent script (§11) — the guards, smoke test and `verify` are plain
  Node scripts in `scripts/`, deliberately not actions.
- **Pinning.** Currently pinned to **major tags**, which receive security patches
  automatically. Addendum §11 requires immutable **commit SHA** pins *"where the repository
  policy requires it"*. **This repository's policy: SHA-pin before any workflow is granted a
  write permission or handles a secret.** Today every job is read-only with no secrets, so
  major-tag pinning is the accepted trade-off between supply-chain rigour and patch latency.
  **Revisit the moment a privileged workflow is introduced** (e.g. release publishing).
- **Dependabot** remains enabled for `github-actions` (security updates only — routine
  version-chasing is disabled per the pinning policy).
- **Adding an action** requires a row in this table plus the §21 dependency review.

## Update process

1. Dependabot opens a PR **only for a security advisory**.
2. Review the diff and the action's changelog — do not merge on green CI alone (§21).
3. Confirm the action still needs no additional permission.
4. Update this table in the same PR.
