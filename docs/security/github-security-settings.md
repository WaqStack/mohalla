# GitHub Security Settings — verified status

**`waqaskhan0/mohalla`** · PUBLIC · verified **3 September 2026** via the GitHub REST API

Per addendum §15: *"Do not claim a feature is enabled until it is verified."* Every row below
was read back from the API after being set — none is assumed.

---

## Enabled during this audit

| Feature | Before | After | How |
|---|---|---|---|
| **Secret scanning** | ❌ disabled | ✅ **enabled** | `PATCH /repos/.../security_and_analysis` |
| **Push protection** | ❌ disabled | ✅ **enabled** | same |
| **Dependabot vulnerability alerts** | ❌ disabled | ✅ **enabled** | `PUT /repos/.../vulnerability-alerts` |
| **Dependabot security updates** | ❌ disabled | ✅ **enabled** | `PUT /repos/.../automated-security-fixes` |
| **Private vulnerability reporting** | ❌ disabled | ✅ **enabled** | `PUT /repos/.../private-vulnerability-reporting` |
| **Code scanning (CodeQL default setup)** | ❌ not configured | ✅ **configured** | `PATCH /repos/.../code-scanning/default-setup` |

> Security updates require **alerts** to be on first — the initial call failed until alerts
> were enabled, then succeeded. Recorded because the ordering is not obvious.

**Secret-scanning alerts: 0.** GitHub's scanner independently agrees with the manual
full-history scan.

## Already correct — unchanged

| Feature | Status |
|---|---|
| Default Actions token permissions | ✅ `read` (repo level) |
| Actions can approve pull requests | ✅ `false` |
| Branch ruleset `main protection` | ✅ `active`, no bypass actors |
| Required status checks | ✅ 4 CI jobs, strict (branch must be up to date) |
| Force-push / deletion of `main` | ✅ blocked — verified by a rejected push (`GH013`) |
| Linear history | ✅ required |
| Self-hosted runners | ✅ none |
| Actions secrets configured | ✅ none |

## Deliberately NOT changed — owner decisions

| Setting | Current | Recommendation |
|---|---|---|
| **Required approving reviews** | **0** | Raise to **1** when a second maintainer exists. It is 0 only because GitHub forbids self-approval and 1 would make `main` unmergeable for a solo maintainer. **Zero required reviews is not permission for an agent to merge** (§19) — the owner makes every merge decision. |
| **Require review from Code Owners** | off | Enable once **OD-020** names a technical owner; `CODEOWNERS` currently holds a deliberate placeholder. |
| **Require signed commits** | off | Enable once maintainers have signing keys. |
| **Fork PR workflow approval** | `allowed_actions: all` | Consider *"Require approval for all outside collaborators"* in Settings → Actions before accepting fork PRs. Low risk today: fork PRs run **unprivileged** and no secrets exist. |
| **Repository visibility** | **public** | Owner's explicit decision. If it ever returns to private, branch protection stops working without **GitHub Pro/Team**. |

## Re-verification

```bash
gh api repos/waqaskhan0/mohalla --jq '.security_and_analysis'
gh api repos/waqaskhan0/mohalla/private-vulnerability-reporting
gh api repos/waqaskhan0/mohalla/actions/permissions/workflow
gh api repos/waqaskhan0/mohalla/rulesets
gh api repos/waqaskhan0/mohalla/secret-scanning/alerts --jq 'length'
```
