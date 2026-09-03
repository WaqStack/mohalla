# Dependency and Supply-Chain Policy

**Per addendum §21**, consistent with the version-pinning rule in
[`../foundation/04-toolchain-versions.md`](../foundation/04-toolchain-versions.md) §1.

---

## Before adding a production dependency, record

| Field | Why |
|---|---|
| Purpose | What it does that the platform cannot |
| Maintainer | Who ships it |
| Support status | Actively maintained? Last release? |
| Licence | Compatible with the (still undecided) project licence — see [`../governance/LICENSE-DECISION-REQUIRED.md`](../governance/LICENSE-DECISION-REQUIRED.md) |
| Security history | Known advisories, response record |
| Transitive impact | How many packages it drags in |
| Runtime impact | Bundle size, cold start, memory |
| **Can existing capability do the job?** | The default answer is *use what we have*. PostgreSQL already provides the queue, search and locking |

## Standing rules

- **Commit lockfiles.** CI runs `npm ci`, never `npm install`.
- **Pin exact versions.** Never adopt a release because it is newer (§1 of the toolchain doc).
- **Keep major upgrades out of feature work.** Never mix an AGP, Kotlin, Node, NestJS or
  PostgreSQL major upgrade into a backend module commit.
- **Do not merge a Dependabot major on green CI alone.** Review breaking changes, migration
  requirements, security relevance, and compatibility with the frozen Stage 4 architecture.
- **Dependabot is configured for security updates only** — routine version bumps are disabled.
  Ten initial version-chasing PRs were closed on this basis; the reasoning is in the
  `.github/dependabot.yml` header.

## Architecture-forbidden dependencies

Stage 4 excludes these from V1 and public visibility does not change that: **Redis ·
Elasticsearch · Kafka · Kubernetes · microservices · GraphQL · video infrastructure**. Adding
one is an architecture change requiring a new ADR, not a dependency decision.

## Current audit state

`npm audit --audit-level=high` is a CI job. Latest local run: **0 vulnerabilities**.
