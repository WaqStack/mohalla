# ADR-020 — Feed: fan-out on read with keyset pagination

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-09

## Context

BR-026: feeds are strictly reverse-chronological with no algorithmic ranking. Four surfaces exist — Following (FEED-FR-001), Discover (FEED-FR-003), Featured (FEED-FR-002) and inline events. Pages are 20 items (NFR-PERF-006), pagination must be stable while new posts arrive (FEED-FR-004, EDGE-017), and first content must render within 3 seconds over 3G (NFR-PERF-001).

Every read must exclude blocked users in both directions, auto-hidden content, deleted content and banned authors (BR-027, BR-028, SEC-019).

Scale: 1,000 users at launch, 10,000 without redesign.

## Options considered

**A — Fan-out on read.** Query posts by followed authors at request time.

**B — Fan-out on write.** Materialise a timeline row per follower on every post.

**C — Hybrid.** Fan-out on write for high-follower accounts only.

## Decision

**Fan-out on read.**

## Why

Fan-out on write exists to make reads cheap when the follow graph is enormous and the read-to-write ratio is extreme. Neither holds here. At 10,000 users a Following query is an indexed range scan over a bounded author set — fast, and it needs no timeline storage, no backfill when someone follows, and no cleanup when someone blocks.

**The moderation requirements make fan-out on write actively worse.** When a post is auto-hidden at the third report (SAFETY-FR-004), a materialised design must find and update every copy. When A blocks B, it must purge B's rows from A's timeline and vice versa. Fan-out on read applies those as predicates in one query and is correct by construction — which matters because SEC-019 requires block enforcement **on every read path**, not just feed assembly.

## Pagination

Keyset on `(created_at DESC, id DESC)`, not `OFFSET`. The cursor is an opaque encoding of that pair. This gives stability under insertion: a post created during browsing cannot shift a page boundary, so nothing repeats and nothing is skipped (EDGE-017, FEED-FR-004). `OFFSET` cannot make that guarantee.

Pull-to-refresh queries **forward** of the newest known key and prepends (FEED-FR-005).

## Surfaces

| Surface | Query |
|---|---|
| **Following** | Posts by followed authors, minus exclusions, keyset-ordered |
| **Discover** | All visible posts, minus exclusions, keyset-ordered |
| **Featured** | Admin announcements, unexpired, limit 5 — **queried independently so it renders before follow-dependent data resolves** (FEED-FR-002, RSK-001) |
| **Category filter** | Adds a category predicate; **ordering never changes** (FEED-FR-006) |

## Featured independence
FEED-FR-002 is the cold-start guarantee (RSK-001). It is a separate endpoint with its own cache (ADR-017), so a slow or empty Following query never delays it. A new user who follows nobody still sees a populated screen.

## Indexes
`posts (created_at DESC, id DESC) WHERE visibility_state = 'VISIBLE'` — a partial index, since hidden and deleted posts are never returned. Plus `posts (author_id, created_at DESC)` for profile lists and the Following join, and `follows (follower_id, followee_id)`.

## Counts
Per ARCH-CONFLICT-003: denormalised counters as the fast path, with a bounded per-viewer correction for blocked contributors.

## Benefits
No timeline storage or backfill; block and moderation changes take effect immediately with no fan-out repair; stable pagination; simple to reason about and to test.

## Disadvantages
Read cost grows with the followed-author count — bounded in practice and indexed. A user following thousands of accounts would be the first stress case; not a realistic V1 shape.

## Security impact
Positive. Exclusions are predicates in the query, so a block cannot be missed by a stale materialised row.

## Privacy impact
Blocked content is never assembled, not merely hidden at render.

## Operational impact
None beyond index maintenance.

## Revisit trigger
Measured Following-feed latency breaching NFR-PERF-002 at the p95, on real data. **Measurement, not anticipation** — and the first response would be indexing or a read replica, not fan-out on write.
