# ADR-017 — Caching: client and in-process only. No shared cache tier in V1.

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-03, NFR-PERF-001/002, NFR-AVAIL-002

## Context

Distinct from ADR-010, which covers background jobs. This ADR covers read caching.

Three pressures: a 3-second feed over 3G (NFR-PERF-001), 800 ms p95 read APIs (NFR-PERF-002), and graceful degradation showing cached content with an offline indicator when the network is lost (NFR-AVAIL-002).

A hard counter-pressure: **cached content must not survive a permission change.** If A blocks B, B must not continue seeing A's cached posts, and a direct request for them must fail neutrally (SEC-019, BR-025).

## Decision

Three cache layers. **No shared server-side cache tier in V1.**

### 1. Client cache — Android
Feed pages, profile summaries and media are cached on-device to satisfy NFR-AVAIL-002. Rules:
- Cached content is **read-only when offline**; every write action is disabled with an explanation (SRS §16)
- **TTL is short — proposed 5 minutes for feed and profile payloads** — because a longer TTL risks showing content across a block or moderation change
- **The cache is cleared entirely on logout** (SET-FR-006 requires no cached personal content after logout), **on block/unblock**, and **on account state change**
- Media is cached by immutable object name, so it never goes stale (ADR-012)

### 2. In-process cache — API
Small, short-lived, per-instance:
- Session lookups (ADR-008) — TTL bounded so revocation stays within one request cycle
- Category list — effectively static
- Featured announcements — short TTL; supports rendering Featured before follow-dependent data (FEED-FR-002)

### 3. CDN — media only
Immutable objects only. **No API response is CDN-cached** — every API read is permission-dependent.

## Why no Redis

A shared cache would be justified by cross-instance cache coherence, which requires more than one instance. V1 runs one. Adding Redis now buys nothing and adds a service to operate, secure and monitor.

**More importantly, the risk profile is wrong.** Every cacheable read here is permission-dependent — feeds, profiles, posts and counts all vary by who is asking and by block state. A shared cache keyed carelessly is exactly how one user is served another's filtered view. At this scale the safe design is to cache little, briefly, and per-instance.

## Explicitly not cached
Anything block-sensitive across users · message content · moderation queue · audit log · admin responses · any authenticated API response at the CDN.

## Benefits
No new infrastructure; no cross-user cache-poisoning class of bug; offline behaviour satisfied on the client where it belongs.

## Disadvantages
Repeated reads hit the database — acceptable at this scale and measured against NFR-PERF-002.

## Security impact
Positive. The most dangerous caching bug in a social product — serving one user content filtered for another — is avoided by not having a shared response cache.

## Privacy impact
Client cache holds personal content, so **clearing on logout is a requirement, not an optimisation** (SET-FR-006).

## Operational impact
None.

## Revisit trigger
Horizontal scaling (which also triggers Redis for Socket.IO), or a measured read hotspot that indexing cannot fix.
