# Public Repository Policy

**`waqaskhan0/mohalla` is PUBLIC.** This is the operating rule set for working in it.

---

## 1. The operating assumption

Treat **all** of the following as world-readable, permanently:

committed files · complete Git history · every branch and tag · every pull request, its
description and comments · commit messages · issues · Actions logs · Actions artifacts · test
and coverage reports · build metadata · dependency manifests · database schemas and migrations
· the OpenAPI document · documentation · generated fixtures · anything accidentally uploaded as
an artifact.

**Nothing may enter those surfaces that would be unsafe for an unknown person on the internet
to read or download.**

> **Branch protection is an integrity control, not a confidentiality control.** A protected
> branch stops unreviewed *changes*; it does not hide anything.

## 2. The security principle

Assume an attacker has read every endpoint, table, validation rule, rate limit, authorization
policy, job name and state transition — because they can.

**Security rests on:** authentication · server-side authorization · object-level authorization
· database constraints · opaque server-backed sessions with immediate revocation · input
validation · rate limiting · transactions · least privilege · encryption · append-only audit ·
monitoring.

**Security must never rest on:** secret endpoint names · hidden controller paths · unpublished
schema names · obscure identifiers · client-side controls · UI-hidden actions.

Publishing the implementation **raises** the bar for correct controls; it does not change any
approved product behaviour.

## 3. Test and fixture data

Only **deterministic synthetic** data, and it must be **visibly fictional**.

**Never:** real employees, beneficiaries or partners · real mobile numbers · real messages,
reports or moderation cases · real admin accounts · production database copies, logs or media.

**Use:** reserved example domains (`example.com`) · synthetic names · sequential placeholder
identifiers (`+923001234567`) · provider-approved test numbers for SMS adapters.

> Audit finding **PD-001** exists precisely because one API example was a *plausibly real*
> phone number rather than a visibly fictional one. "Looks realistic" is the failure mode.

**No CI test may send SMS, email, push or media to a real recipient.** External providers are
exercised through fake adapters or sandboxes only.

## 4. Documentation

**May explain:** architecture, API design, database schema, security controls, development
setup, contribution process, test strategy.

**Must not contain:** live credentials · production secrets · unredacted personal data ·
internal emergency access methods · real admin usernames · production IPs or private
infrastructure identifiers · real beneficiary records · unapproved internal contacts ·
instructions that bypass authorization.

## 5. Before every push

Run the gate in [`../foundation/DEVELOPMENT.md`](../foundation/DEVELOPMENT.md) and §34 of the
addendum: tests · format · lint · typecheck · architecture guards · migration validation ·
OpenAPI validation · secret scan · synthetic-fixture check · workflow-permission review ·
artifact review · `git diff` and `git status` review.

**`npm run verify` covers the automatable lanes. Record PASS/FAIL. Do not push on FAIL.**

## 6. Branch and merge rules

`main` is protected. **Never** push feature code directly to it; never force-push; never bypass
required checks.

```
local implementation → local tests → audit → secret scan → commit
→ push feature branch → CI → Pull Request → OWNER REVIEW → merge decision
```

**Required approvals are currently 0 for solo-maintainer reasons. That is not permission for an
agent to merge.** The repository owner makes every merge decision.

## 7. What publication does not authorize

A public repository and a green build are **not** authorization to publish container images,
npm packages, Maven artifacts, Android releases, database snapshots or deployment bundles.
Each requires separate approval.
