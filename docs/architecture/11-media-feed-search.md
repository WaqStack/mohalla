# 11 — Media, Feed & Search

**Stage 4 · Shehersaaz Community Platform** · Version 1.1 · Status: **Complete**
**Diagrams:** `media-flow.mmd` · `feed-flow.mmd` · **Decisions:** ADR-012, ADR-013, ADR-020, ADR-011

> 🟦 **REQUIREMENT** approved · 🟩 **ARCHITECTURE** decision · 🟨 **PROPOSED DEFAULT** changeable · 🟥 **PROPOSED PRODUCT CHANGE** not approved

---

## 1. Media pipeline

🟦 MEDIA-FR-001…005 · SEC-012/013/015 · EDGE-013/014

```
device compress (<500 KB)  →  presigned PUT  →  PRIVATE quarantine/
   →  worker: magic-byte inspection, size + dimension recheck
        ├─ pass → promote to media/<random key> + derive thumbnail → READY
        └─ fail → delete object → REJECTED
   →  post may reference media ONLY when READY   (trigger-enforced)
```

**States:** `PENDING_UPLOAD → PROCESSING → READY | REJECTED`

### Security boundary

| Property | Guarantee |
|---|---|
| Quarantine is **private** | Own access policy; **never fronted by the CDN**; no public URL |
| Client cannot choose the final key | Presigned URL targets a server-chosen quarantine key; the served key is generated at promotion (SEC-015) |
| Type from **bytes** | Magic-byte inspection. Extension and client MIME ignored entirely (SEC-013) |
| Size and dimensions **rechecked** | Declared values are advisory; the worker re-measures (SEC-012, MEDIA-FR-005) |
| Failures deleted | Rejected objects removed, not accumulated |
| Post gating | Trigger on `post_media` rejects non-`READY` media |

### PDF — CONDITIONAL SHOULD, with a Technical Lead gate

✅ **OD-023 revised and approved 1 September 2026.** The earlier "magic-byte only" proposal was **not approved**.

🟦 **SEC-013 requires executable content to be rejected from every upload path.** A valid PDF signature is not evidence of safety, and **a Should feature may not weaken a Must security requirement**.

**Mandatory before PDF ships:** parse and verify actual PDF **structure** · reject malformed files · **reject detectable embedded executable/active content** · quarantine never exposed · random final keys · 10 MB server-side · device viewer only.

✅ **Production gate:** the **Technical Lead must approve the selected capability** before PDF is enabled in production.

✅ **If no practical safe mechanism fits V1: CUT PDF FROM V1.** POST-FR-005, MEDIA-FR-003 and MEDIA-FR-004 are Should, so this does not block the MVP. Images are unaffected and remain Must. See ADR-013 and ADR-022.

### Delivery
🟩 ADR-012 — post and profile media via CDN with long cache. **Conversation media via signed short-lived URLs, not shared-cached** (MSG-FR-008).

### Cleanup
Daily sweep: `PENDING_UPLOAD`/`PROCESSING`/`REJECTED` older than 24 h; orphans; media of deleted posts; media of erased accounts (PRIV-007).

---

## 2. Feed

🟦 FEED-FR-001…007 · BR-026/027/028 · EDGE-017/018 · 🟩 ADR-020 fan-out on read

### Query shape

```sql
SELECT … FROM posts p
JOIN follows f ON f.followee_id = p.author_id AND f.follower_id = :viewer   -- Following only
WHERE p.visibility_state = 'VISIBLE'
  AND NOT blocked(:viewer, p.author_id)          -- both directions, SEC-019
  AND author_state <> 'BANNED'                   -- suspended authors REMAIN visible
  AND (:category IS NULL OR p.category_id = :category)
  AND (p.created_at, p.id) < (:cursor_ts, :cursor_id)      -- keyset
ORDER BY p.created_at DESC, p.id DESC
LIMIT 20;
```

| Surface | Difference |
|---|---|
| Following | The `follows` join |
| Discover | No join — all visible posts (FEED-FR-003) |
| **Featured** | **Separate endpoint, no follow dependency, own cache** (FEED-FR-002) |
| Category filter | Adds a predicate; **ordering never changes** (FEED-FR-006) |
| Pull to refresh | Keyset **forward** of the newest key; prepend (FEED-FR-005) |

🟩 **Featured independence is a requirement, not an optimisation.** FEED-FR-002 is the cold-start guarantee against RSK-001 — the product's largest risk. A slow or empty Following query must not delay it.

**Stability (EDGE-017)** — keyset, never `OFFSET`. A post inserted mid-browse cannot shift a page boundary.

**Counts** — denormalised, with a bounded per-viewer correction for blocked contributors (ARCH-CONFLICT-003). 🟩 Two users may legitimately see different totals; ENGAGE-FR-006 says so.

---

## 3. Search

🟦 SEARCH-FR-001…005 · BR-042 · PRIV-011 · 🟩 ADR-011 PostgreSQL FTS + `pg_trgm`

### Normalisation

Each searchable row carries a generated `search_norm` containing: the original text lowercased and diacritic-stripped; a **transliterated** form via a deterministic Urdu→Roman mapping; and a **normalised** form collapsing common Roman variants.

🟩 The transliteration dictionary is a **versioned data file**, reviewable and extendable without a schema change. It handles the frequent vowel-length and consonant variants that dominate Pakistani Roman Urdu typing.

**Indexes:** GIN over `to_tsvector(search_norm)` for tokens; `gin_trgm_ops` for fuzzy and partial.

**Ranking:** relevance then recency — for the **search page only**. 🟦 BR-026 keeps every feed strictly chronological; no ranking leaks into a feed.

### Filters — all applied in-query

Blocked either direction · auto-hidden · deleted · banned authors. Suspended accounts **remain findable** (SEARCH-FR-001) — a suspension is temporary and hiding it would break existing conversations.

### Failure

🟦 **SEARCH-FR-003 E3 — a failure must never render as zero results.** `503 SEARCH_UNAVAILABLE`, distinct from an empty set, because "no results" falsely tells the user the content does not exist.

### Privacy

🟦 **PRIV-011** — recent searches on-device only. **No endpoint, no table, no log.** Query text is never logged; service status and query length only.

🟦 **BR-042 sets the bar at best-effort.** RSK-012 accepts imperfect Roman Urdu recall for V1. Revisit trigger is measured dissatisfaction, not anticipation.
