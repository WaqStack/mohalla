# ADR-008 — Session strategy: server-backed opaque tokens

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-06 · resolves ARCH-CONFLICT-001

## Context

ARCH-CONFLICT-001. AUTH-FR-010 proposes a *"Proposed access token 24 h"*. BR-035 requires suspension, ban and deletion to invalidate **every** session immediately, and EDGE-010 requires rejection **within one request cycle**. AUTH-FR-010 also caps concurrent devices at five with oldest-session eviction. Password change and reset must invalidate all other sessions (BR-007, SET-FR-002, AUTH-FR-007).

Administrators authenticate separately with an 8-hour timeout (SEC-024) against a different credential store (SEC-020).

## Options considered

**A — Stateless JWT, 24 h.** Cannot be revoked. Fails BR-035 and EDGE-010 outright.

**B — JWT + denylist.** The denylist is server state read on every request — the statelessness is illusory, and it adds a second mechanism. Device capping still needs a registry.

**C — Short JWT (5 min) + rotating refresh.** Narrows the window but does not close it, and doubles the token machinery. A banned user retains write access for up to 5 minutes.

**D — Opaque server-backed session tokens.**

## Decision

**Option D.** A cryptographically random opaque token; a `sessions` row holding the token hash, user, device label, timestamps and revocation reason.

## Why

Every requirement that pushes against statelessness — immediate revocation, five-device cap, oldest eviction, logout-others, admin visibility — requires a server-side session registry. Once that registry exists, a JWT adds a second mechanism with no benefit.

**Option D satisfies EDGE-010 exactly:** revocation is a row update, and the next request fails.

## Why not the obvious objection

*"A database read per request is slow."* At 500 concurrent users on an indexed primary-key lookup this is sub-millisecond and cacheable in-process with a short TTL bounded by the revocation guarantee. The 800 ms p95 budget (NFR-PERF-002) is not threatened.

## Design

- Token: cryptographically random, **stored hashed** — a database leak must not yield usable sessions
- Transport: `Authorization: Bearer`, TLS only (SEC-017)
- Client storage: `EncryptedSharedPreferences` / Keystore (SEC-004)
- Idle expiry: **proposed** 60 days, matching AUTH-FR-010's refresh window
- Device cap: 5; on the sixth login the oldest is revoked with reason `EVICTED` (EDGE-009)
- Revocation reasons: `LOGOUT · PASSWORD_CHANGE · PASSWORD_RESET · SUSPENDED · BANNED · DELETED · EVICTED · ADMIN`
- Admin sessions: **separate table, separate pipeline**, 8-hour absolute timeout (SEC-024, SEC-020)

## Benefits
Immediate revocation; device cap and eviction in the same mechanism; admin-visible active sessions; one concept to reason about.

## Disadvantages
A read per request; sessions table grows and needs periodic pruning of expired rows.

## Security impact
Strongly positive. Closes ARCH-CONFLICT-001. Hashed storage limits leak impact. A single revocation path is easier to audit than two.

## Privacy impact
Session rows hold a device label and timestamps — classified internal, never exposed to other users, and erased with the account (PRIV-007).

## Operational impact
One pruning job under `pg-boss`.

## Cost impact
Negligible.

## Revisit trigger
Session lookup measured as a latency bottleneck — the first response would be caching, not JWTs.
