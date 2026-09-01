# ADR-007 — Identifier strategy: UUIDv7

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-07, SEC-011

## Context

Identifiers appear in URLs, in client-generated idempotency keys (EDGE-021), and in every foreign key. They must not be enumerable, must index well under insert-heavy load, and must be generatable on the client for message deduplication.

## Options considered

| Option | Index locality | Enumerable | Client-generatable | Size |
|---|---|---|---|---|
| bigint sequence | Excellent | **Yes** | No | 8 B |
| UUIDv4 | **Poor** — random inserts fragment B-trees | No | Yes | 16 B |
| UUIDv7 | Good — time-ordered prefix | No | Yes | 16 B |
| ULID | Good | No | Yes | 16 B (26-char text) |

## Decision

**UUIDv7 as both primary key and public identifier.** No separate internal/external mapping.

### Two valid generation strategies — the format is identical either way

| | Strategy | Use when |
|---|---|---|
| **Preferred** | **Database-native `uuidv7()`** as a column default | The selected managed PostgreSQL service exposes it. Verified 1 September 2026: PostgreSQL provides built-in `uuidv7()`, documented for PostgreSQL 18 |
| **Portable fallback** | **Application-generated RFC-compatible UUIDv7** in the persistence layer | The selected service offers an earlier major version, or does not expose the function |

**The on-the-wire and on-disk identifier format is byte-identical under both.** Column type is `uuid` in both cases; only the source of the value differs, behind a single `IdGenerator` port.

> **This is deliberate: the identifier strategy must not constrain hosting selection.** ADR-016 defers provider and region until latency is measured and OD-019 is answered. Requiring a PostgreSQL-18-only function before that decision would invert the dependency.

Clients must generate UUIDv7 anyway for `clientMessageId` (EDGE-021), so the application-side generator exists regardless.

## Why

UUIDv7's time-ordered prefix gives most of a sequence's insert locality while remaining non-enumerable. Being client-generatable is a hard requirement for MSG-FR-002 and EDGE-021, where the client must produce a message identifier before the server sees it so retries cannot duplicate.

A separate internal bigint plus a public UUID was rejected: it doubles keys, adds a lookup on every request, and buys nothing at this scale.

ULID was rejected only because PostgreSQL generates UUIDv7 natively while ULID would need an extension or application code.

## Benefits
One identifier per row. Non-enumerable. Client-generatable. Sortable by creation time, which pairs with keyset pagination on `(created_at, id)` (ADR-018). Native generation.

## Disadvantages
16 bytes rather than 8 — immaterial here. The timestamp prefix reveals creation time, which is already public on posts, comments and events. **For sessions and OTP challenges this is irrelevant, since those identifiers are never exposed.**

## Security impact
Positive but bounded. **Non-enumerable identifiers are not an authorization control.** SEC-011 object-level checks are required on every request regardless, and unguessable IDs are defence in depth only. This is stated explicitly so the two are never conflated.

## Privacy impact
Neutral. Where creation-time inference would matter, the resource is not exposed.

## Operational impact
None.

## Cost impact
Marginally larger indexes.

## Revisit trigger
None for the format. The **generation strategy** is selected at EPIC-00 once the host's PostgreSQL version is confirmed; switching between the two is a change to one port implementation and requires no migration.
