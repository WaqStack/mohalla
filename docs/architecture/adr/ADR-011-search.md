# ADR-011 — Search: PostgreSQL FTS + pg_trgm + normalised transliteration

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-10

## Context

SEARCH-FR-001 (users, Must), SEARCH-FR-002 (posts, Should) and SEARCH-FR-004 (events, Could) must work across Urdu script, English and Roman Urdu. BR-042 sets the standard explicitly: *"transliteration is best-effort, not exhaustive. Common variants must be handled; complete coverage of every possible spelling is explicitly not required for V1."*

SEARCH-FR-003's acceptance criteria are concrete: a post written in Urdu script containing the word for water must be findable by searching `pani`, and the reverse. RSK-012 already records that Roman Urdu recall may disappoint.

A distinct requirement: **search failure must never render as a zero-results state**, because that would falsely tell a user the content does not exist (SEARCH-FR-003 E3, SRS §16).

## Options considered

**A — PostgreSQL FTS + `pg_trgm` + a normalised search column.** No new infrastructure.

**B — Elasticsearch / OpenSearch.** Better recall and ranking; a cluster to provision, secure, monitor, back up and keep in sync.

## Decision

**Option A.**

## Design

Each searchable row carries a generated `search_norm` column holding:
1. the original text, lowercased and diacritic-stripped
2. a **transliterated** form produced by a deterministic Urdu-to-Roman mapping
3. for Roman input, a **normalised** form collapsing common variant spellings

A small, versioned transliteration dictionary handles the frequent cases — the vowel-length and consonant variants that dominate Pakistani Roman Urdu typing. It is a data file, reviewable and extendable without a schema change.

Indexes: a GIN index on `to_tsvector` over `search_norm` for token matching, plus a `gin_trgm_ops` index for fuzzy and partial matching. Users are matched on display name and username; posts on body text; events on title and description.

Ranking is relevance then recency — appropriate for a search page, and explicitly **not** applied to any feed, which stays strictly reverse-chronological under BR-026.

## Why

BR-042 sets a best-effort bar that PostgreSQL meets. Elasticsearch would add a cluster the team must operate, plus an index-synchronisation problem, for a corpus that will hold thousands of posts in year one — not millions.

Keeping search in the primary database also keeps the **visibility filters correct by construction**: blocked, auto-hidden, deleted and banned-author content must be excluded (SEARCH-FR-001/002), and those predicates are joins in the same query rather than a synchronisation concern.

## Benefits
No new infrastructure; visibility filters applied in the same query; the dictionary is reviewable data; one backup covers search.

## Disadvantages
Recall on unusual Roman Urdu spellings will be imperfect — accepted under BR-042 and tracked as RSK-012. Ranking is cruder than a dedicated engine. Search load sits on the primary database.

## Security impact
Neutral. Parameterised queries only (SEC-016). **Query text is never logged** (PRIV-010, SRS §16 — service status and query length only).

## Privacy impact
Positive. Recent searches remain on the device and are never transmitted (PRIV-011, SEARCH-FR-005). No server-side search history exists.

## Operational impact
Two extensions and two index types. Index bloat monitored with storage growth (NFR-SCAL-003).

## Cost impact
None beyond database storage.

## Revisit trigger
Measured user dissatisfaction with recall, or corpus growth beyond roughly 10^6 posts. **The trigger is measurement, not anticipation.**
