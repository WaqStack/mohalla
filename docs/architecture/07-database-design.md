# 07 — Database & Data Architecture

**Stage 4 · Shehersaaz Community Platform (Mohalla — محلہ)**
Version 1.1 · Status: **Complete**
**Engine:** PostgreSQL (ADR-004) · **Identifiers:** UUIDv7 (ADR-007) · **ERD:** `diagrams/database-erd.mmd`

---

## 1. Principles

1. **The database carries business rules that must not be bypassable.** Uniqueness, thresholds, one-per-user constraints and audit immutability are `CONSTRAINT`s and privileges, not application checks. This satisfies NFR-MAIN-002 and means an AI-generated code path cannot violate them.
2. **Four roles.** `migration_owner` owns the schema and every table, and is used **only** by the deployment pipeline. `runtime_app` and `runtime_worker` are the process credentials — full DML on data tables, but `SELECT`/`INSERT` only on `audit_log`. `read_only_support` is `SELECT` on non-sensitive tables for diagnosis. **Production runtime never connects as the owner role**, so the application cannot alter its own schema or mutate the audit trail.
3. **State is explicit.** Lifecycles use enumerated state columns with legal-transition checks, never booleans. Deletion, moderation and message requests all depend on this.
4. **Soft delete only where visibility must change without losing the record.** Posts, comments and events use `visibility_state`. Likes, follows and RSVPs are hard-deleted — there is nothing to preserve.
5. **Every timestamp is `timestamptz`, stored UTC.** Display converts to `Asia/Karachi`. Events additionally store an explicit IANA zone.
6. **No personal data in an index name, a constraint name, or an error message.**

---

## 2. Table catalogue

33 tables in eight groups. Every table has `id` (UUIDv7) unless a composite key is stated, plus `created_at timestamptz NOT NULL DEFAULT now()`.

### 2.1 Identity & authentication

#### `users`
Account identity and lifecycle. **One row per account, never deleted while an audit trail references it.**

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | uuid PK | no | UUIDv7 |
| `state` | enum | no | `UNVERIFIED` `ACTIVE` `SUSPENDED` `BANNED` `PENDING_DELETION` `DELETED` |
| `account_type` | enum | no | `INDIVIDUAL` · `ORGANIZATION` — BR-011, not user-changeable |
| `username` | citext | yes | **UNIQUE, case-insensitive, immutable** — BR-005. Null only between OTP verification and username selection |
| `password_hash` | text | no | Argon2id — SEC-001 |
| `date_of_birth` | date | no | PRIV-002 — **never in a public projection** |
| `state_changed_at` | timestamptz | no | Drives suspension expiry |
| `suspended_until` | timestamptz | yes | Non-null only while `SUSPENDED` — BR-034 |
| `terms_version` | text | no | AUTH-FR-009 — accepted version recorded |
| `terms_accepted_at` | timestamptz | no | BR-004 |
| `language` | enum | no | `en` · `ur` — LOCALE-FR-002, stored against the account |

**Constraints**
- `UNIQUE (username)` on `citext` → EDGE-007, EDGE-008 handled by the database, not by a read-then-write race
- `CHECK (state <> 'SUSPENDED' OR suspended_until IS NOT NULL)`
- `CHECK (username IS NULL OR username ~ '^[a-z][a-z0-9_]{2,19}$')` → §12 format
- `CHECK (date_of_birth <= current_date - interval '13 years')` → BR-002 enforced in the database

**Retention:** row survives erasure with all personal columns nulled; `state = DELETED`.

---

#### `user_identifiers`
Verified phone, plus optional secondary email. **✅ OD-021 Option C, approved 1 September 2026 — every normal V1 account must hold a verified Pakistani mobile number.** The table stays polymorphic so a future identity method needs one constraint relaxed, not a migration (ADR-021).

| Column | Type | Notes |
|---|---|---|
| `user_id` | uuid FK | |
| `kind` | enum | `PHONE` · `EMAIL` |
| `value_normalized` | text | E.164 for phone. **Never enters a public DTO — PRIV-003** |
| `value_hash` | bytea | **UNIQUE**, peppered. Used for ban matching and duplicate detection without scanning plaintext |
| `is_primary` | boolean | Exactly one true per user |
| `verified_at` | timestamptz | Null until OTP or link verification |

**Constraints**
- `UNIQUE (value_hash)` → BR-001, one account per identifier
- `UNIQUE (user_id) WHERE is_primary` — partial unique index
- `CHECK (kind = 'PHONE' AND value_normalized ~ '^\+92[0-9]{10}$' OR kind = 'EMAIL')` — Pakistan restriction on the phone path
- **`CHECK (NOT is_primary OR kind = 'PHONE')`** — ✅ **OD-021 Option C.** The primary identifier must be a phone number in V1. **This single line is what a future version relaxes to admit another identity method**; nothing else changes
- Every account must have exactly one `is_primary` row, so an account without a verified phone cannot exist

---

#### `banned_identifiers`
Resolves **ARCH-CONFLICT-005**: enforces BR-036 permanently without retaining a plaintext number.

| Column | Type | Notes |
|---|---|---|
| `identifier_hash` | bytea PK | Peppered — same function as `user_identifiers.value_hash` |
| `banned_at` | timestamptz | |
| `reason` | text | |
| `source_user_id` | uuid FK nullable | Null once the account is erased |

> **The pepper is a secret (SEC-025). Rotating it invalidates the ban list**, so rotation requires a documented migration that re-hashes from a controlled source. Recorded as an operational constraint.

---

#### `sessions` · `admin_sessions`
Two tables, never one. **SEC-020 requires separate credential stores.**

| Column | Type | Notes |
|---|---|---|
| `token_hash` | bytea | **UNIQUE. The token is stored hashed** — a database leak must not yield usable sessions |
| `device_label` | text | Coarse only; no fingerprint — PRIV-012 |
| `expires_at` | timestamptz | Users: 60-day idle. Admins: **8-hour absolute** — SEC-024 |
| `revoked_at` / `revoked_reason` | timestamptz / enum | `LOGOUT` `PASSWORD_CHANGE` `PASSWORD_RESET` `SUSPENDED` `BANNED` `DELETED` `EVICTED` `ADMIN` |

**Index:** `(user_id) WHERE revoked_at IS NULL` — supports the five-device cap and oldest-session eviction in one query (EDGE-009).

---

#### `otp_challenges`
| Column | Notes |
|---|---|
| `identifier_hash` | Keyed by hash, not by user — a challenge exists before an account may |
| `code_hash` | bytea. **The code is never stored in plaintext** |
| `attempts` | smallint, max 5 — SEC-003 |
| `expires_at` | 10 minutes |
| `consumed_at` | Single-use — set on success, resend, or attempt exhaustion |

**Index:** `(identifier_hash, consumed_at) WHERE consumed_at IS NULL`.
**Retention:** purged 24 hours after expiry.

---

#### `admins`
Separate identity store. **Rows are created only by the provisioning CLI (S2-CR-005). There is no `INSERT` path from any HTTP handler, and no bootstrap endpoint exists.**

`state ∈ {ACTIVE, DISABLED}`. **There is no column an administrator could use to act on another administrator** — enforcement actions target `users` only, which is how BR-ADM-001 and SEC-021 become structural rather than procedural.

---

### 2.2 Profile & taxonomy

#### `profiles`
| Column | Notes |
|---|---|
| `user_id` | PK and FK — 1:1 with `users` |
| `display_name` | Not unique — BR-010 |
| `city` | Free text — PRIV-012, never derived from the device |
| `photo_media_id` | FK → `media`, must be `READY` |
| `verified_badge` | boolean, **admin-granted only** — ADMIN-FR-010 |
| `verified_by_admin_id`, `verified_at` | Audit trail for the badge |
| `follower_count` · `following_count` · `post_count` | Denormalised — see §5 |
| `search_norm` | tsvector, generated — ADR-011 |

> **`visibility` is deliberately absent as a user-settable column.** BR-VIS-001 fixes it to `PUBLIC` in V1. It is modelled as a **profile-level concept** so Phase 2 can add the column without touching every read path — which is exactly what S2-DEC-004 intended.

#### `categories`
Eleven seeded rows: `id`, `slug`, `name_en`, `name_ur`, `sort_order`. Fixed list, not user-extensible (BR-017). Content is **DEP-012 / OD-017**; the eleven from UI/UX §15 are seeded as the default.

#### `profile_interests`
`(user_id, category_id)` composite PK. PROFILE-FR-011, Could-have — cuttable with no dependency.

---

### 2.3 Social graph

#### `follows`
`(follower_id, followee_id)` composite PK — **makes EDGE-015 impossible by construction**; a repeated follow is a no-op upsert, not a duplicate row.
`CHECK (follower_id <> followee_id)` → BR-019.

#### `blocks`
`(blocker_id, blocked_id)` composite PK. `CHECK (blocker_id <> blocked_id)`.

**Blocking is unilateral in the row and mutual in effect.** Every read path tests both directions:

```sql
NOT EXISTS (
  SELECT 1 FROM blocks
  WHERE (blocker_id = :viewer AND blocked_id = :author)
     OR (blocker_id = :author AND blocked_id = :viewer)
)
```

This predicate is implemented **once**, in a shared query fragment owned by the `safety` module, and applied on every read path — feeds, search, profile, post detail, comments, messaging, notifications and events (SEC-019, BR-025).

**Index:** `(blocker_id, blocked_id)` and `(blocked_id, blocker_id)` — both directions are queried.

---

### 2.4 Content

#### `posts`
| Column | Notes |
|---|---|
| `body` | ≤3,000 **grapheme clusters** — BR-012. Enforced in application code because SQL `length()` counts code points; the database `CHECK` uses a generous byte ceiling as a backstop |
| `category_id` | Nullable — zero or one, BR-017 |
| `visibility_state` | `VISIBLE` `AUTO_HIDDEN` `ADMIN_REMOVED` `AUTHOR_DELETED` |
| `like_count` · `comment_count` | Denormalised — §5 |
| `distinct_report_count` | Maintained transactionally — §6.3 |
| `edited_at` | Non-null once edited — POST-FR-008 marks the post "edited" |

**Why four visibility states rather than a boolean:** each has different behaviour. `AUTO_HIDDEN` is visible **to the author only**, marked under review (PROFILE-FR-004). `ADMIN_REMOVED` is visible to nobody but retained for the audit trail. `AUTHOR_DELETED` is user-initiated and **cannot be restored by an administrator** (BR-014). A boolean cannot express this, and ADMIN-FR-003 depends on the distinction.

#### `media`
`state ∈ {PENDING_UPLOAD, PROCESSING, READY, REJECTED}` — the quarantine lifecycle of ADR-013.
`storage_key` is random and unrelated to the original filename (SEC-015). The original filename is **discarded, not stored**.
`mime_verified` records the type determined by **content inspection**, never the client's claim (SEC-013).

#### `post_media`
`(post_id, media_id)` PK, plus `position smallint CHECK (position BETWEEN 0 AND 3)` and `UNIQUE (post_id, position)` → BR-013, at most four images with stable order.

**A trigger rejects insertion unless the referenced media is `READY`** — this is what closes the race in ADR-013 step 7.

#### `link_previews`
One per post (`post_id` PK) — POST-FR-004. Populated by a **server-side** fetch, so the user's address is never disclosed to the linked host (SEC-014).

#### `likes`
`(user_id, post_id)` composite PK → **BR-031 enforced by the database**. EDGE-015's rapid-tap case cannot drift the count.

#### `comments`
`parent_comment_id` nullable, with `CHECK` enforcing **one level**: a comment whose parent itself has a parent is rejected. A reply to a reply attaches to the same parent thread (BR-033).
Deleting a comment cascades to its replies (ENGAGE-FR-004).

---

### 2.5 Messaging

#### `conversations`
**One row per pair, forever (BR-024).** Enforced by storing the pair in canonical order:

```sql
user_low_id  uuid NOT NULL,
user_high_id uuid NOT NULL,
CHECK (user_low_id < user_high_id),
UNIQUE (user_low_id, user_high_id)
```

Ordering the pair means a second conversation cannot be created by approaching from the other side — MSG-FR-001's "existing thread opens rather than a second being created" is structural.

#### `conversation_participants`
Two rows per conversation. Holds the **per-side** state, which is what makes message requests and blocking work:

| Column | Notes |
|---|---|
| `request_state` | `ACCEPTED` · `PENDING` · `DECLINED` — MSG-FR-005 |
| `unread_count` | Per participant |
| `hidden_at` | Set when this participant blocks the other — the conversation disappears from **their** inbox only, and returns intact on unblock (MSG-FR-003, SAFETY-FR-006) |

**`request_state` is per-participant, not per-conversation.** That is what allows the recipient to have a pending request while the sender sees an ordinary thread — and what makes a decline invisible to the sender (BR-028).

#### `messages`
| Column | Notes |
|---|---|
| `client_message_id` | uuid, **generated on the device before sending** |
| `created_at` | **Server clock** — orders both sides identically (MSG-FR-004) |

**`UNIQUE (conversation_id, client_message_id)`** — this single constraint satisfies EDGE-020 and EDGE-021. A retry, a transport switch, or a duplicate delivery all resolve to the same row via `ON CONFLICT DO NOTHING`, returning the original.

---

### 2.6 Events

#### `events`
`event_type ∈ {ONLINE, PHYSICAL}` with a conditional constraint:

```sql
CHECK ( (event_type = 'ONLINE'   AND meeting_url   IS NOT NULL)
     OR (event_type = 'PHYSICAL' AND location_text IS NOT NULL) )
```

`going_count` and `interested_count` are denormalised.

> **ARCH-CONFLICT-006 / D-17.** EVENT-FR-004 permits a public **count** but states the attendee list is not shown in V1. `event_rsvps` therefore has **no read path exposed to ordinary users**. There is no `GET /events/{id}/attendees` endpoint, and no response body carries attendee identities. The table exists because RSVP is one-per-user and reminders must be addressed — not because the list is displayed.

`status ∈ {SCHEDULED, CANCELLED}` — a cancelled event stays visible, marked cancelled, until its original date passes (EVENT-FR-007).

#### `event_rsvps`
`(event_id, user_id)` PK → one response per user (EVENT-FR-004). Changing from Interested to Going is an update, so the user is counted once.

---

### 2.7 Notifications

`notifications` · `notification_preferences` · `device_tokens` · `outbox`.

**`outbox` is written in the same transaction as the business change** (ADR-014) — the durability guarantee, not an optimisation.

`notification_preferences` is `(user_id, category)` with `push_enabled`. **Preferences gate push only**; the in-app centre always records everything (NOTIF-FR-007).

`device_tokens.invalidated_at` is set when FCM reports the token invalid.

**Retention:** notifications 90 days (NOTIF-FR-002); a notification whose target is deleted is **removed**, not orphaned.

---

### 2.8 Safety, moderation & audit

#### `reports`
**`UNIQUE (reporter_id, target_type, target_id)`** → BR-030 and EDGE-023 enforced by the database. A second report from the same user is an `ON CONFLICT DO NOTHING` that returns the same acknowledgement **without revealing the tally** (SAFETY-FR-001).

`severity` is derived from `reason_code` at insert: Violence → `CRITICAL`; Harassment, Hate speech, Sexual content → `HIGH`; False information, Impersonation → `MEDIUM`; Spam, Something else → `LOW` (SAFETY-FR-003).

#### `moderation_cases`
| Column | Notes |
|---|---|
| `state` | `OPEN` `RESOLVED_RESTORED` `RESOLVED_DELETED` `RESOLVED_NO_ACTION` `CLOSED_AUTHOR_DELETED` |
| `max_severity` · `distinct_report_count` | Queue ordering: severity → count → age (ADMIN-FR-002) |
| `resolution_reason` | `CHECK (state = 'OPEN' OR char_length(resolution_reason) >= 5)` → **BR-038 enforced by the database** |
| `version` | integer, **optimistic lock** → EDGE-024 |

#### `enforcement_actions`
`target_user_id` references `users` — **never `admins`**. There is no schema path by which an enforcement action could target an administrator (BR-ADM-001, SEC-021).

#### `audit_log`
**Append-only, and protected from mutation by application and administrator roles** (ADR-018). Owned by a role the runtime never uses:

```sql
ALTER TABLE audit_log OWNER TO migration_owner;
REVOKE ALL            ON audit_log FROM PUBLIC;
GRANT  SELECT, INSERT ON audit_log TO runtime_app, runtime_worker;
-- UPDATE, DELETE, TRUNCATE never granted to a runtime role
```

The ORM repository exposes `append()` and `query()` only; no admin API can mutate it; CI asserts the grants on every deploy; backups include it and restore rehearsals verify its row count.

> **Not described as cryptographic immutability.** The infrastructure owner retains emergency database capability, which cannot be revoked without making the system unrecoverable. Optional chained-hash or signed-digest tamper evidence is evaluated in ADR-018 and deliberately not adopted for V1.

Records enforcement, verification, publication, **sensitive-data views** (phone, email, DOB — SEC-022, PRIV-008), **reported-conversation access** (PRIV-009), and every admin login.

#### `deletion_requests`
`requested_at`, `scheduled_erasure_at` (= +30 days), `restored_at`, `completed_at`. Drives the day-30 job and makes EDGE-029 answerable (ADR-019).

---

## 3. State machines

### 3.1 User account
```
UNVERIFIED ──OTP verified──► ACTIVE ──admin──► SUSPENDED ──expiry/reinstate──► ACTIVE
     │                          │                                   
     └──24h expiry──► (row purged)   ├──admin──► BANNED ──reinstate──► ACTIVE
                                     └──user──► PENDING_DELETION ──30d──► DELETED (terminal)
                                                       └──login+restore──► ACTIVE
```
Transitions are validated in the application **and** guarded by a `CHECK` on `(state, suspended_until)`. `DELETED` is terminal.

### 3.2 OTP challenge
`ISSUED → CONSUMED` (success) · `→ EXPIRED` (10 min) · `→ INVALIDATED` (resend supersedes — EDGE-005) · `→ LOCKED` (5 attempts, 15-min lockout on the identifier).

### 3.3 Content moderation
`VISIBLE → AUTO_HIDDEN` (threshold) `→ VISIBLE` (restore, **count reset to zero** — ADMIN-FR-003) or `→ ADMIN_REMOVED` (terminal). `VISIBLE → AUTHOR_DELETED` at any time (terminal, not admin-restorable — BR-014).

### 3.4 Moderation case
`OPEN → RESOLVED_{RESTORED|DELETED|NO_ACTION}` · `OPEN → CLOSED_AUTHOR_DELETED` (EDGE-025).

### 3.5 Message request
Per participant: `PENDING → ACCEPTED` (inbox) · `PENDING → DECLINED` (suppressed, sender unsignalled) · `PENDING → ACCEPTED` **automatically** when the recipient follows the sender (MSG-FR-005 A3).

### 3.6 Media
`PENDING_UPLOAD → PROCESSING → READY` (content inspection passes) · `PROCESSING → REJECTED` (fails) · swept after 24 h.

### 3.7 Event
`SCHEDULED → CANCELLED`. Independently `VISIBLE → AUTO_HIDDEN` at **2** distinct reports (BR-044).

### 3.8 Account deletion
`ACTIVE|SUSPENDED → PENDING_DELETION → DELETED`, with restore available for exactly 30 days (ADR-019).

---

## 4. Index plan

| Index | Table | Purpose | Requirement |
|---|---|---|---|
| `(created_at DESC, id DESC) WHERE visibility_state='VISIBLE'` | posts | **Partial** — Discover feed keyset | FEED-FR-003, ADR-020 |
| `(author_id, created_at DESC) WHERE visibility_state='VISIBLE'` | posts | Following join, profile list | FEED-FR-001, PROFILE-FR-008 |
| `(follower_id, followee_id)` | follows | Following set | SOCIAL-FR-001 |
| `(followee_id, follower_id)` | follows | Follower list | SOCIAL-FR-003 |
| `(blocker_id, blocked_id)` + `(blocked_id, blocker_id)` | blocks | **Both directions on every read** | SEC-019 |
| GIN `to_tsvector(search_norm)` | posts, profiles, events | Full-text | SEARCH-FR-002 |
| GIN `search_norm gin_trgm_ops` | posts, profiles, events | Fuzzy / Roman Urdu | SEARCH-FR-003 |
| `(conversation_id, created_at DESC)` | messages | History keyset | MSG-FR-003 |
| `UNIQUE (conversation_id, client_message_id)` | messages | **Idempotency** | EDGE-021 |
| `(user_id) WHERE revoked_at IS NULL` | sessions | Device cap, eviction | EDGE-009 |
| `(recipient_id, created_at DESC) WHERE read_at IS NULL` | notifications | Unread badge | NOTIF-FR-002 |
| `(state, max_severity DESC, distinct_report_count DESC, opened_at) WHERE state='OPEN'` | moderation_cases | **Queue ordering** | ADMIN-FR-002 |
| `(starts_at) WHERE status='SCHEDULED' AND visibility_state='VISIBLE'` | events | Upcoming list | EVENT-FR-005 |
| `(scheduled_erasure_at) WHERE completed_at IS NULL` | deletion_requests | Day-30 job | PRIV-007 |
| `UNIQUE (value_hash)` | user_identifiers | One account per identifier | BR-001 |
| `UNIQUE (identifier_hash)` | banned_identifiers | Ban check at registration | BR-036 |

**Partial indexes are used deliberately.** Hidden and deleted posts are never returned by a feed, so indexing them wastes space and slows writes.

---

## 5. Counts — resolving ARCH-CONFLICT-003

PROFILE-FR-009 and ENGAGE-FR-006 require counts to exclude blocked users **in both directions**, making every count viewer-dependent. A plain counter column is therefore wrong; computing per viewer on every request threatens NFR-PERF-002.

**Resolution — two-part:**

1. **Denormalised counter** on `posts`, `comments`, `profiles` and `events`, maintained transactionally with the action.
2. **Bounded per-viewer correction**: subtract the contribution of accounts the viewer has blocked or is blocked by. The viewer's block list is small and indexed, so this is a cheap `EXISTS`-style adjustment rather than a full recount.

**This is faithful to the SRS, not a compromise.** ENGAGE-FR-006 explicitly states two users may see different totals. The behaviour is documented so QA does not raise it as a defect.

---

## 6. Concurrency and race conditions

Each case names the mechanism, not just the intent.

| # | Race | Mechanism | Requirement |
|---|---|---|---|
| 1 | **Two users claim the same username** | `UNIQUE` on `citext username`. One `INSERT` wins; the loser receives a retry prompt | EDGE-007, EDGE-008 |
| 2 | **Duplicate registration submitted twice** | `UNIQUE (value_hash)` on `user_identifiers` inside the creating transaction | EDGE-001 |
| 3 | **Duplicate like from rapid taps** | `(user_id, post_id)` PK with `ON CONFLICT DO NOTHING`; counter updated only when a row is actually inserted | EDGE-015, BR-031 |
| 4 | **Duplicate follow** | `(follower_id, followee_id)` PK, idempotent upsert | EDGE-015 |
| 5 | **Duplicate report** | `UNIQUE (reporter_id, target_type, target_id)`; same acknowledgement returned, count unchanged | EDGE-023, BR-030 |
| 6 | **Third report triggers auto-hide** | Report insert, distinct-count recompute and `visibility_state` update occur **in one transaction** with `SELECT … FOR UPDATE` on the target row. Two simultaneous third reports cannot double-hide or miss | **SAFETY-FR-004** |
| 7 | **Two admins act on one case** | `version` column; the update carries `WHERE version = :seen`. Zero rows affected means someone else resolved it, and the second admin is shown **who and how** | **EDGE-024** |
| 8 | **Duplicate message delivery** | `UNIQUE (conversation_id, client_message_id)`, `ON CONFLICT DO NOTHING` returning the original | EDGE-020, EDGE-021 |
| 9 | **RSVP count drift** | `(event_id, user_id)` PK; counter updated from the transition, not incremented blindly | EVENT-FR-004 |
| 10 | **Suspension expires mid-request** | Effective state is derived: `SUSPENDED AND suspended_until > now()`. The scheduled job is a tidy-up, so expiry is correct even if the job is late | EDGE-028 |
| 11 | **Restore at day 29 vs erasure at day 30** | Both take `SELECT … FOR UPDATE` on `deletion_requests`. Whichever commits first sets the state; the second observes it and aborts | **ADR-019** |
| 12 | **Post deleted while a comment is being written** | Comment insert re-checks `visibility_state` inside the transaction; FK plus state check rejects it and the client keeps the typed text | ENGAGE-FR-002 |
| 13 | **Media promoted after the post references it** | Trigger rejects `post_media` insert unless the media row is `READY` | ADR-013 |

---

## 7. Data classification & retention

| Data | Class | Purpose | Encryption | Access | Retention | On deletion |
|---|---|---|---|---|---|---|
| Mobile number | **Sensitive** | Identity, auth, ban | TLS + at rest in backups | Owner + admin (audited) | Life of account | **Erased day 30**; hash to `banned_identifiers` if banned |
| Password hash | **Secret** | Auth | Argon2id | Nobody — never read out | Life of account | Erased |
| Date of birth | **Sensitive** | Age eligibility only | TLS + backup | Owner + admin (audited) | Life of account | Erased |
| Email | **Sensitive** | Alt identity / recovery | TLS + backup | Owner + admin (audited) | Life of account | Erased |
| Display name, username, bio, city, photo | **Public** | Profile | TLS | All authenticated | Life of account | Erased; content re-attributed |
| Post / comment text | **Public** | Content | TLS | All authenticated | Indefinite (**O1**) | **Retained, anonymised** — BR-009 |
| Message body | **Private** | 1:1 conversation | TLS | Participants only; admin **only** via a reported case | Indefinite | **Retained for the counterpart, sender anonymised** — BR-046, ARCH-CONFLICT-004, *legal review* |
| Session token hash | **Secret** | Auth | Hashed at rest | Nobody | Until expiry/revocation | Erased |
| OTP code hash | **Secret** | Verification | Hashed at rest | Nobody | 24 h after expiry | n/a |
| Device token | Internal | Push | TLS | System | Until invalid | Erased |
| Recent searches | **Device only** | Convenience | Device storage | Device only | Device-controlled | **Never on the server** — PRIV-011 |
| Server logs | Internal | Diagnosis | TLS | Engineers | **30 days** | No message text, passwords, OTPs or tokens — PRIV-010 |
| Audit log | **Sensitive** | Accountability | TLS + backup | Admins, read-only | **Indefinite** | **Retained pseudonymously** — *legal review, OD-019* |
| Media | Public / private | Content | TLS | Per class (ADR-012) | Life of content | Deleted with account |

---

## 8. Migration & integrity policy

- **One tool, forward-only migrations.** No manual production schema change, ever.
- `app_migrate` owns the schema; `app_rw` cannot alter it.
- **Every migration is reviewed by a human** — this is one of the mandatory review gates in §36.
- Destructive migrations require a verified backup immediately beforehand (SEC-026).
- A CI check asserts `REVOKE UPDATE, DELETE ON audit_log` remains in force.
- Schema drift between staging and production is detected on every deploy.

---

## 9. Traceability

| Rule | Enforcement | Where |
|---|---|---|
| BR-001 one account per identifier | `UNIQUE (value_hash)` | Database |
| BR-002 minimum age 13 | `CHECK` on `date_of_birth` | Database |
| BR-005 username unique + immutable | `UNIQUE citext` + no update path | Database + application |
| BR-013 max 4 images | `CHECK position 0–3` + `UNIQUE (post_id, position)` | Database |
| BR-019 no self-relationship | `CHECK` on follows, blocks | Database |
| BR-024 one conversation per pair | Ordered pair + `UNIQUE` | Database |
| BR-030 one report per user per item | `UNIQUE (reporter, target)` | Database |
| BR-031 one like per user per post | Composite PK | Database |
| BR-032 auto-hide thresholds | Transactional count + `FOR UPDATE` | Database transaction |
| BR-033 one-level replies | `CHECK` on `parent_comment_id` | Database |
| BR-036 banned identifier | `banned_identifiers` lookup at registration | Database |
| BR-038 mandatory reason | `CHECK` on `moderation_cases` | Database |
| BR-039 append-only audit | **`REVOKE UPDATE, DELETE`** | Database privilege |
| BR-ADM-001 no admin-on-admin | `enforcement_actions` cannot reference `admins` | Schema shape |
| BR-044 events threshold 2 | Per-type threshold in the transaction | Database transaction |
| SEC-011 object-level authz | Ownership predicates on every query | Application, per module |
| SEC-019 block enforcement | Shared bidirectional predicate | Application, one fragment |
