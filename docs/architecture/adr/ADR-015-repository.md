# ADR-015 — Repository strategy: monorepo

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-15, AI-agent operating model

## Context

Deliverables: an Android app (Gradle/Kotlin), an API (Node/TypeScript), a worker (same codebase as the API), an admin web app (Node/TypeScript), shared API contracts, 91 design tokens, and bilingual localization strings — built by two developers using AI agents.

A single feature routinely spans API, contracts and app. RTL correctness depends on tokens and strings staying in step with both clients.

## Options considered

**A — Monorepo.** One repository, multiple workspaces.

**B — Multi-repo.** One per deliverable, contracts published as a package.

## Decision

**Monorepo.**

## Why

Three arguments, in order:

1. **Atomic cross-cutting change.** Adding a field touches the OpenAPI contract, the API, the generated Kotlin client and the app. In a monorepo that is one pull request that either passes CI or does not. In multi-repo it is three PRs, a version bump and a window where they disagree.
2. **Design tokens and localization are shared by construction.** 91 tokens and ~400 strings feed both clients. In multi-repo they need publishing and versioning; in a monorepo they are a workspace.
3. **AI agents work better with the contract visible.** An agent implementing an endpoint can read the OpenAPI document, the requirement and the screen spec in one tree. Cross-repo context is where agents drift.

## Structure

```
apps/
  mobile/        Android · Kotlin · Compose · Gradle
  api/           NestJS · REST + Socket.IO gateway
  worker/        pg-boss consumers · shares api/src via workspace
  admin/         Next.js · admin portal + public interstitial + policy pages
packages/
  contracts/     OpenAPI source of truth + generated TS and Kotlin clients
  design-tokens/ 91 tokens · single source → TS constants + Kotlin/Compose theme
  localization/  en/ur string catalogues → both clients
  validation/    Shared field rules from SRS §12, used by API and clients
docs/
  product/ requirements/ design/ architecture/
infra/
  migrations/ · environment templates · CI workflows
```

**Design tokens and validation rules are generated into both languages from one source.** A token or a length limit cannot drift between the API, the app and the admin, which is what NFR-MAIN-002 requires.

## CI lanes
Two: a Node lane (`pnpm`) and a Gradle lane, each triggered by path filters so an app-only change does not run API tests.

## Benefits
Atomic changes; no internal package publishing; one issue tracker and one review process; agents see the whole contract.

## Disadvantages
Mixed toolchains in one repository; checkout is larger; path-filtered CI needs care so the Gradle lane does not run on every commit.

## Security impact
One place to enforce secret scanning and dependency scanning (SEC-025). One CODEOWNERS file gates the security-sensitive paths listed in §36.

## Privacy impact
None.

## Operational impact
One repository to back up and configure.

## Revisit trigger
Team grows beyond roughly six developers, or a deliverable needs a genuinely independent release cadence.
