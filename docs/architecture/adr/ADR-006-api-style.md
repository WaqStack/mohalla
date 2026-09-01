# ADR-006 — API style: REST

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-05, SEC-011

## Context

One first-party client in V1 (Android) plus an Admin Portal with a different permission model. All lists are bounded at 20 (NFR-PERF-006). Object-level authorization must be checked on every request touching a resource (SEC-011), and responses must never disclose whether a target exists (SEC-006, error handling §16).

## Options considered

**A — REST.** Resource-oriented, one authorization check per endpoint, trivial per-endpoint rate limiting, cacheable, easy to document in OpenAPI.

**B — GraphQL.** Flexible querying, fewer round trips.

## Decision

**REST**, with a versioned prefix and separate mobile and admin namespaces.

## Why

GraphQL's central benefit is letting diverse clients shape their own queries. There is one client, and its screens are fully specified in the UI/UX document — the query shapes are known in advance.

Against that, GraphQL makes three required things harder:

1. **Object-level authorization (SEC-011)** must be enforced per field and per node rather than per endpoint, which is where IDOR bugs breed.
2. **Rate limiting (SEC-005)** per operation is difficult when everything is one POST.
3. **Neutral not-found semantics** — a partial-error response can leak the existence of a resource that a REST 404 hides.

For a two-person team where SEC-011 is a Must, REST's one-check-per-endpoint model is the safer default.

## Benefits
Explicit authorization per endpoint; per-endpoint rate limits; standard HTTP status semantics matching SRS §16; OpenAPI contract generates client types; simple caching.

## Disadvantages
Some endpoint proliferation; occasional over-fetching — bounded, since payloads are already capped at 20 items.

## Security impact
Positive, for the three reasons above.

## Privacy impact
Positive. Response DTOs are declared per endpoint, so a public projection cannot accidentally include a phone number (PRIV-003).

## Operational impact
One OpenAPI document as the contract of record.

## Cost impact
None.

## Revisit trigger
Multiple divergent clients with materially different data needs.
