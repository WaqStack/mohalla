# ADR-002 — Admin framework: Next.js

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-14, ARCH-CONFLICT-008

## Context

The Admin Portal is nine desktop-first, English-only screens (UX-ADM-001…009) behind its own authentication boundary. There is no SEO requirement and no public content.

Separately, ARCH-CONFLICT-008 established that V1 needs a small public web surface that is **not** a web product: an Android App-Links interstitial for shared post links (ENGAGE-FR-007) and publicly reachable policy documents (PRIV-017, SET-FR-008, DEP-007) — the latter a Google Play submission condition.

## Requirements

AUTH-FR-011 · ADMIN-FR-001…012 · SEC-016/020/024 · NFR-COMP-003 · PRIV-017/018 · ENGAGE-FR-007

## Options considered

**A — React + Vite SPA.** Lightest and simplest for a behind-auth tool. Needs a second deployment for the public interstitial and policy pages.

**B — Next.js App Router.** Heavier for an admin tool, but one deployment serves the admin SPA, the interstitial, and the policy pages.

## Decision

**Next.js (App Router).**

## Why

The deciding factor is not the admin tool — Vite would serve it well. It is that ARCH-CONFLICT-008 creates a genuine second requirement for a small public web surface, and running two deployments for a two-person team is worse than running one slightly heavier one.

Server-rendered policy pages are also the correct shape: they must be crawlable and reachable by Google Play review without JavaScript.

## Benefits
One deployment, one CI lane, one TLS certificate. Public pages are statically rendered. Shares TypeScript and the contracts package with the API.

## Disadvantages
More framework than an admin SPA needs. Care is required to keep admin routes strictly client-side-authenticated and out of any static build.

## Security impact
The public surface and the admin surface live in one deployment — **a routing boundary, not a trust boundary**. Mitigation: admin routes are grouped under an authenticated layout; no admin data is ever server-rendered into a public route; SEC-016 output encoding is mandatory because user-generated content is rendered in the admin, which is the highest-value stored-XSS target.

## Privacy impact
Policy pages are static and carry no analytics (PRIV-012).

## Operational impact
One managed deployment.

## Cost impact
Negligible at this scale.

## Revisit trigger
Admin needs an independent deployment lifecycle, or the public surface grows beyond an interstitial and policy documents — which would be a scope change.
