# 06 — Backend Module Boundaries

**Stage 4 · Shehersaaz Community Platform (Mohalla — محلہ)**
Version 1.1 · Status: **Complete**
**Style:** Modular monolith (ADR-005) · **Framework:** NestJS (ADR-003) · **Diagram:** `diagrams/backend-modules.mmd`

---

## 1. Why boundaries are enforced, not merely documented

Two developers with AI agents will implement 124 requirements. The single largest risk to maintainability is an agent asked to fix messaging reaching into moderation because the import compiled.

**In NestJS a module that has not declared an import cannot inject the other module's providers.** The boundary is a compile-time constraint, not a convention. That is the reason ADR-003 chose it, and this document is the contract that makes it real.

**Two additional gates**, both in CI:
1. A dependency-direction check fails the build on any import violating §3.
2. A cycle check fails the build on any circular module dependency.

---

## 2. Layers — where each kind of logic lives

| Layer | Contains | Must never contain |
|---|---|---|
| **Transport** — controllers, Socket.IO gateway | HTTP shape, DTO validation, status codes, correlation IDs | Business rules, database access |
| **Application** — use-case services | Orchestration, transaction boundaries, authorization calls, event emission | SQL, HTTP concepts |
| **Domain** — entities, rules, policies | Business rules from SRS §11, state machines, invariants | Framework or persistence types |
| **Repository** | Queries, mapping, the shared visibility predicate | Business decisions |
| **Adapters** | SMS, FCM, object storage, email — behind ports | Domain logic |
| **Jobs** | Scheduled and queued handlers | Duplicated rules — they call application services |

**Rules with teeth**
- **No business rule may live in a controller.** A controller validates shape and delegates. Reviewed at every PR.
- **The transaction boundary is the application service**, never the repository or the controller.
- **Authorization is a guard plus an explicit in-service ownership check.** The guard establishes *who*; the service establishes *whether this actor may touch this object* (SEC-011).
- **Audit emission is not optional** for admin actions — it happens inside the same transaction as the action (ADR-018).

---

## 3. Dependency direction

Three tiers. **Dependencies point downward only.**

```
Transport
    ↓
Admin modules ──► Product modules ──► Platform modules
                                            ↓
                                       (nothing)
```

| Tier | Modules | May depend on |
|---|---|---|
| **Platform** | `identity` · `localization` · `media` · `audit` · `notifications` | Nothing in the product tier |
| **Product** | `profile` · `social-graph` · `safety` · `posts` · `engagement` · `feed` · `events` · `messaging` · `search` · `settings` | Platform + declared product peers |
| **Admin** | `moderation` · `admin-ops` | Platform + product |

**`notifications` is a platform module that nothing calls synchronously.** Product modules emit domain events; the notification pipeline consumes them asynchronously (ADR-014). This is what stops fifteen modules importing `notifications` and creating a hub.

**`safety` is deliberately low in the product tier** because almost everything depends on it — the block predicate and the report/threshold machinery. It depends only on `profile` and `social-graph`, so nothing above it creates a cycle.

---

## 4. Module specifications

Each module: purpose · owned entities · services · dependencies · events produced/consumed · transactions · authorization · privacy risk · tests.

---

### 4.1 `identity` — Platform
**Requirements:** AUTH-FR-001…012 · BR-001…007 · SEC-001…008 · SEC-020

| | |
|---|---|
| **Owns** | `users` · `user_identifiers` · `banned_identifiers` · `sessions` · `otp_challenges` · `admins` · `admin_sessions` |
| **Services** | `RegistrationService` · `OtpService` · `AuthenticationService` · `SessionService` · `AdminAuthService` · `PasswordService` |
| **Depends on** | SMS port · email port (only if OD-021 retains AUTH-FR-004) |
| **Produces** | `user.registered` · `user.verified` · `user.state_changed` · `session.revoked` |
| **Consumes** | `moderation.enforcement_applied` → revoke sessions (BR-035) |
| **Transactions** | Registration: create user + identifier + OTP + outbox, one transaction. Login: session insert + oldest-session eviction, one transaction |
| **Authorization** | Public for auth endpoints; everything else owner-only |
| **Privacy risk** | **Highest in the system.** Holds phone, email, DOB and password hashes. No service here may return an identifier to any caller outside `identity` — enforced by returning `UserId` plus a public projection only |
| **Tests** | Uniform response *and timing* on wrong password vs unknown number vs banned (SEC-006) · OTP expiry, attempt cap, single-use · five-device eviction · revocation within one request cycle |

> **D-16 / OD-021.** `identity_type` and the polymorphic `user_identifiers` table exist from day one. **Phone is the Must path and is built first.** If OD-021 retains AUTH-FR-004, the email adapter plugs into the same services with no schema change; if it is cut, the enum simply carries one value.

---

### 4.2 `localization` — Platform
**Requirements:** LOCALE-FR-001…006 · BR-040/041/042

| | |
|---|---|
| **Owns** | String catalogues (`packages/localization`), `users.language` |
| **Services** | `TranslationService` — resolves a key + locale to text |
| **Depends on** | Nothing |
| **Used by** | `notifications` (recipient-language rendering), all error responses |
| **Privacy risk** | None |
| **Tests** | Every key exists in both `en` and `ur` — **a CI check fails the build on a missing Urdu key**, so DEP-011 cannot silently ship half-translated |

**RTL is a client concern**, not a server one. The server never sends layout direction; it sends a locale and localized strings.

---

### 4.3 `media` — Platform
**Requirements:** MEDIA-FR-001…005 · SEC-012/013/015 · ADR-013

| | |
|---|---|
| **Owns** | `media` |
| **Services** | `UploadSlotService` · `ValidationService` (worker) · `PromotionService` · `SweepService` |
| **Depends on** | Object-storage port |
| **Produces** | `media.ready` · `media.rejected` |
| **Transactions** | Slot issue: media row + limit check. Promotion: state change + derived variant |
| **Authorization** | Owner-only until attached; then inherits the parent's visibility |
| **Privacy risk** | Original filenames are **discarded**. Conversation media requires signed short-lived URLs (MSG-FR-008) |
| **Tests** | ZIP renamed `.pdf` rejected (EDGE-014) · oversize rejected server-side even when the client permitted it (MEDIA-FR-005) · fourth image fails, other three survive (EDGE-013) · post referencing non-`READY` media rejected |

---

### 4.4 `audit` — Platform
**Requirements:** ADMIN-FR-012 · BR-038/039 · SEC-022/023 · PRIV-008/009

| | |
|---|---|
| **Owns** | `audit_log` |
| **Services** | `AuditService.record(...)` — the **only** write path |
| **Depends on** | Nothing |
| **Authorization** | Write: admin actions only. Read: admins, **read-only** |
| **Privacy risk** | Holds *who viewed whose phone number*. Reading the audit log is itself audited |
| **Tests** | `UPDATE` and `DELETE` rejected at the database role · sensitive-view access produces an entry · reason-less enforcement rejected |

**Immutability is a database privilege, not a service rule** (ADR-018). `AuditService` is a convenience, not the guarantee.

---

### 4.5 `notifications` — Platform
**Requirements:** NOTIF-FR-001…007 · LOCALE-FR-006 · BR-027

| | |
|---|---|
| **Owns** | `notifications` · `notification_preferences` · `device_tokens` · `outbox` |
| **Services** | `OutboxDispatcher` (worker) · `NotificationService` · `PushService` · `DeviceTokenService` |
| **Depends on** | FCM port · `localization` |
| **Consumes** | Domain events from every product module |
| **Transactions** | Outbox row is written **by the producing module** in its own transaction; this module only reads it |
| **Privacy risk** | Push payloads reach the lock screen. Carries no phone, email or DOB |
| **Tests** | **Message Request produces no push** (BR-027) · declined push permission loses nothing (NOTIF-FR-001) · 12 likes in an hour batch to one (NOTIF-FR-003) · recipient-language rendering · deleted target removes the notification |

---

### 4.6 `profile` — Product
**Requirements:** PROFILE-FR-001…011 · BR-005/010/011 · PRIV-003/004

| | |
|---|---|
| **Owns** | `profiles` · `categories` · `profile_interests` |
| **Services** | `ProfileService` · `UsernameService` · `VerificationBadgeService` (write reserved to `admin-ops`) |
| **Depends on** | `identity` · `media` |
| **Produces** | `profile.updated` |
| **Authorization** | Read: any authenticated user, subject to the block predicate. Write: **owner only** — an admin may not edit a profile |
| **Privacy risk** | **The public projection is defined here and used everywhere.** It contains display name, username, photo, city, bio, badge and counts — and nothing else. Phone, email and DOB are structurally absent (PRIV-003) |
| **Tests** | Case-insensitive username uniqueness (EDGE-008) · concurrent claim (EDGE-007) · username not editable after creation · cross-user edit rejected with 403 regardless of interface |

---

### 4.7 `social-graph` — Product
**Requirements:** SOCIAL-FR-001…005 · BR-018…023

| | |
|---|---|
| **Owns** | `follows` |
| **Services** | `FollowService` · `SuggestionService` |
| **Depends on** | `profile` · `safety` (block predicate) |
| **Produces** | `social.followed` |
| **Authorization** | Self-service; cannot follow self or across a block |
| **Tests** | Repeat follow idempotent (EDGE-015) · blocked follow rejected server-side (EDGE-016) · **unfollow produces no notification** (BR-020) · suggestions exclude blocked, banned and self, and put verified organizations first |

---

### 4.8 `safety` — Product
**Requirements:** SAFETY-FR-001…009 · BR-025/030/032/037/044 · SEC-019

| | |
|---|---|
| **Owns** | `blocks` · `reports` · `moderation_cases` |
| **Services** | `BlockService` · `ReportService` · `ThresholdService` · **`VisibilityPolicy`** · `RateLimitService` |
| **Depends on** | `profile` · `social-graph` |
| **Produces** | `safety.blocked` · `safety.reported` · `safety.content_auto_hidden` |
| **Transactions** | **Report insert + distinct-count + threshold evaluation + visibility update, one transaction with `FOR UPDATE`** |
| **Authorization** | Any authenticated user may report or block; not self |
| **Privacy risk** | The reporter's identity is visible to admins, **never to the reported user** |
| **Tests** | Third distinct report hides a post; second hides an event (BR-044) · same user reporting thrice does not (EDGE-023) · block hides bidirectionally everywhere and **never discloses itself** · concurrent third reports do not double-hide |

> **`VisibilityPolicy` is the most reused object in the codebase.** It owns the bidirectional block predicate and the visibility-state filter, and **every read path in every module composes it**. This is how SEC-019 becomes structural rather than a checklist item repeated fifteen times.

---

### 4.9 `posts` — Product
**Requirements:** POST-FR-001…010 · BR-012…017 · BR-VIS-001 · BR-VID-001

| | |
|---|---|
| **Owns** | `posts` · `post_media` · `link_previews` |
| **Services** | `PostService` · `LinkPreviewService` |
| **Depends on** | `profile` · `media` · `safety` |
| **Produces** | `post.created` · `post.deleted` |
| **Transactions** | Create: post + post_media + counter + outbox, one transaction |
| **Authorization** | Create: `ACTIVE` only — **suspended users rejected server-side regardless of the interface**. Edit/delete: author only |
| **Privacy risk** | **Link previews are fetched server-side** so the user's address never reaches the linked host (SEC-014). The fetcher must refuse internal addresses, cap redirects and response size, and time out |
| **Tests** | Suspended publish rejected · fifth image refused · 3,001 graphemes rejected server-side · edit cannot change attachments (BR-014) · deleted post yields the neutral state to a concurrent reader (EDGE-012) |

---

### 4.10 `engagement` — Product
**Requirements:** ENGAGE-FR-001…008 · BR-020/031/033

| | |
|---|---|
| **Owns** | `likes` · `comments` |
| **Services** | `LikeService` · `CommentService` |
| **Depends on** | `posts` · `safety` |
| **Produces** | `engagement.liked` · `engagement.commented` · `engagement.replied` |
| **Authorization** | `ACTIVE` only. Comment deletion: author **or the post's author** (BR-020) |
| **Tests** | Six rapid taps change the count by at most one (EDGE-015) · one-level nesting enforced · post author may delete any comment on their post; a third party may not · counts exclude blocked contributors (ENGAGE-FR-006) |

---

### 4.11 `feed` — Product
**Requirements:** FEED-FR-001…007 · BR-026/027/028

| | |
|---|---|
| **Owns** | Nothing — a read-only composition module |
| **Services** | `FollowingFeedService` · `DiscoverFeedService` · `FeaturedService` |
| **Depends on** | `posts` · `social-graph` · `safety` · `events` (inline cards) |
| **Authorization** | Authenticated; every query composes `VisibilityPolicy` |
| **Tests** | Strict reverse-chronological (BR-026) · stable keyset under insertion (EDGE-017) · **Featured resolves independently and renders when Following is empty** (RSK-001) · blocked author absent even when followed |

> **`FeaturedService` must not depend on follow data.** FEED-FR-002 is the cold-start guarantee; it is a separate query with its own cache so a slow Following query cannot delay it.

---

### 4.12 `events` — Product
**Requirements:** EVENT-FR-001…008 · BR-043/044/045

| | |
|---|---|
| **Owns** | `events` · `event_rsvps` |
| **Services** | `EventService` · `RsvpService` · `ReminderScheduler` (worker) |
| **Depends on** | `profile` · `safety` |
| **Produces** | `event.created` · `event.rsvp_changed` · `event.changed` · `event.cancelled` |
| **Authorization** | Create: any `ACTIVE` user (BR-043). Edit/cancel: creator only |
| **Privacy risk** | **ARCH-CONFLICT-006 / D-17 — the attendee list is never exposed.** `RsvpService` has no method returning attendee identities to an ordinary user, and no controller route exists. Counts only |
| **Tests** | Online event without a link refused · **join link hidden until 30 minutes before start** (EVENT-FR-003) · type change refused once RSVPs exist · **two distinct reports hide an event** (BR-044) · cancellation notifies everyone who responded Going and suppresses the 1-hour reminder (EDGE-032) |

---

### 4.13 `messaging` — Product
**Requirements:** MSG-FR-001…009 · BR-024/025/027/028/046

| | |
|---|---|
| **Owns** | `conversations` · `conversation_participants` · `messages` |
| **Services** | `ConversationService` · `MessageService` · `MessageRequestService` · `MessagingGateway` (Socket.IO) |
| **Depends on** | `profile` · `social-graph` · `safety` · `media` |
| **Produces** | `message.sent` · `message.request_created` |
| **Transactions** | Send: message insert (`ON CONFLICT DO NOTHING`) + participant unread + `last_message_at` + outbox, one transaction |
| **Authorization** | **Participants only.** Admins have no read path except a reported conversation, and that access is audited (PRIV-009) |
| **Privacy risk** | **Highest after `identity`.** Message bodies are private. The reported-conversation exception is the single admin path and must be scoped to the case |
| **Tests** | Duplicate delivery renders once (EDGE-021) · offline-composed message delivered exactly once (EDGE-020) · **block mid-conversation refuses the send without disclosing the block** (EDGE-019) · **Message Request produces no push** (BR-027) · **decline signals nothing** (BR-028) · recipient deletes account → conversation read-only, history retained (EDGE-022) · admin reading a reported conversation produces an audit entry |

> **`MessageRequestService` is architected inside this boundary** (ARCH-CONFLICT-002). Retaining MSG-FR-005 requires no redesign; cutting it would be a deletion, not a refactor. The architecture is correct either way while OD-022 is unresolved.

---

### 4.14 `search` — Product
**Requirements:** SEARCH-FR-001…005 · BR-042 · PRIV-011

| | |
|---|---|
| **Owns** | Nothing — read-only over other modules' tables |
| **Services** | `SearchService` · `TransliterationService` |
| **Depends on** | `posts` · `profile` · `events` · `safety` |
| **Privacy risk** | **No server-side search history exists** (PRIV-011). Query text is never logged — service status and query length only |
| **Tests** | Urdu-script post found by Roman Urdu and vice versa · blocked user not found by exact username · auto-hidden post not found by exact text · **service failure renders as unavailable, never as zero results** (SEARCH-FR-003 E3) |

---

### 4.15 `settings` — Product
**Requirements:** SET-FR-001…010 · BR-008/009 · PRIV-005/006/007

| | |
|---|---|
| **Owns** | `deletion_requests` |
| **Services** | `SettingsService` · `AccountDeletionService` · `ErasureJob` (worker) |
| **Depends on** | `identity` · `profile` · every module implementing the anonymisation contract |
| **Produces** | `account.deletion_requested` · `account.restored` · `account.erased` |
| **Transactions** | Deletion request: state change + session revocation + request row, one transaction. Erasure: one transaction per module, orchestrated |
| **Authorization** | Owner only. **Available while suspended** (BR-008) |
| **Privacy risk** | Erasure is irreversible — dry-run in staging first |
| **Tests** | Restore at day 29 succeeds; day 31 fails (SET-FR-004 AC) · **restore and erasure cannot interleave** · re-registration during grace refused and redirected (EDGE-029) · pending requests withdrawn (EDGE-030) |

**Each module implements an `AnonymisationContract`** declaring what happens to its data at erasure. Adding a module without implementing it fails the build — so ADR-019's per-entity table cannot silently rot.

---

### 4.16 `moderation` — Admin
**Requirements:** ADMIN-FR-002/003/004 · BR-032/037/038/039 · EDGE-024/025/026

| | |
|---|---|
| **Owns** | Moderation decisions (state on `moderation_cases`) |
| **Services** | `ModerationQueueService` · `ModerationDecisionService` |
| **Depends on** | `safety` · `posts` · `engagement` · `events` · `audit` |
| **Transactions** | Decision: version check + case state + content visibility + **audit entry**, one transaction |
| **Authorization** | Administrators only. **Cannot target an administrator** |
| **Tests** | Queue ordered severity → count → age · **second admin told who resolved it and how** (EDGE-024) · restore resets the count (ADMIN-FR-003) · author deletion closes the case (EDGE-025) · **no automatic deletion ever** (BR-032) · reason-less decision rejected |

> **Restore and Delete are peers in the service API**, with no default and no primary. RSK-010 is that coordinated reporting silences legitimate criticism; a data model or API that biases toward deletion would make that risk worse.
>
> **No prototype reference exists for this module** (ARCH-CONFLICT-009). It is built from UI/UX §27 and SRS §10.14 only, and its tests derive from ADMIN-FR-* acceptance criteria and EDGE-024/025/026.

---

### 4.17 `admin-ops` — Admin
**Requirements:** ADMIN-FR-001/005/006/007/008/009/010/011 · BR-034/035/036 · BR-ADM-001 · SEC-021/022

| | |
|---|---|
| **Owns** | `enforcement_actions` · `announcements` |
| **Services** | `UserLookupService` · `EnforcementService` · `AnnouncementService` · `VerificationService` · `DashboardService` |
| **Depends on** | `identity` · `profile` · `audit` |
| **Transactions** | Enforcement: action + user state + **session revocation** + audit, one transaction |
| **Authorization** | Administrators only. **`EnforcementService` rejects any target that resolves to an administrator — server-side, unconditionally** (SEC-021) |
| **Privacy risk** | `UserLookupService` is the **only** path to a phone, email or DOB, and **every access writes an audit entry** (PRIV-008) |
| **Tests** | Suspension revokes all sessions immediately (EDGE-010) · **suspension attempt against an admin refused server-side** · announcement without Urdu refused (ADMIN-FR-009) · third weekly broadcast refused (NOTIF-FR-005) · verification refused on an Individual account · **viewing a phone number produces an audit entry** · re-suspension replaces rather than accumulates (EDGE-027) |

**Administrator accounts are not manageable here.** No create, disable or delete route exists. Provisioning is a CLI run by the technical owner (S2-CR-005, OD-020).

---

## 5. Cross-module contracts

Three shared abstractions prevent duplication of the rules that matter most.

| Contract | Owner | Consumed by | Guarantees |
|---|---|---|---|
| **`VisibilityPolicy`** | `safety` | Every read path in every module | Bidirectional block filtering + visibility-state filtering — SEC-019, BR-025, BR-028 |
| **`PublicProfileProjection`** | `profile` | Every response containing a user | Phone, email and DOB are structurally absent — PRIV-003 |
| **`AnonymisationContract`** | `settings` | Every module owning user data | Erasure behaviour is declared per module; omission fails the build — PRIV-007 |

---

## 6. Extraction path

Modules are drawn so that extraction is possible. **It is not pre-built, and the trigger is team boundaries, not load** (ADR-005).

| Candidate | Why it would go first | Trigger |
|---|---|---|
| `media` | Different resource profile; already behind a port; communicates via events | Media processing dominates CPU or needs independent scaling |
| `notifications` | Already asynchronous and event-driven; no synchronous callers | Push volume outgrows a shared worker |
| `search` | Read-only; would move with a search engine | ADR-011's revisit trigger fires |

`identity`, `safety` and `audit` **should not be extracted**. They are on every request path, and distributing them would turn a local authorization check into a network call — the opposite of what SEC-011 needs.

---

## 7. Module-to-requirement coverage

| Module | Requirement IDs | Count |
|---|---|---|
| `identity` | AUTH-FR-001…012 | 12 |
| `localization` | LOCALE-FR-001…006 | 6 |
| `profile` | PROFILE-FR-001…011 | 11 |
| `social-graph` | SOCIAL-FR-001…005 | 5 |
| `posts` | POST-FR-001…010 | 10 |
| `media` | MEDIA-FR-001…005 | 5 |
| `feed` | FEED-FR-001…007 | 7 |
| `engagement` | ENGAGE-FR-001…008 | 8 |
| `messaging` | MSG-FR-001…009 | 9 |
| `events` | EVENT-FR-001…008 | 8 |
| `search` | SEARCH-FR-001…005 | 5 |
| `notifications` | NOTIF-FR-001…007 | 7 |
| `safety` | SAFETY-FR-001…009 | 9 |
| `moderation` + `admin-ops` | ADMIN-FR-001…012 | 12 |
| `settings` | SET-FR-001…010 | 10 |
| `audit` | ADMIN-FR-012 (shared) | — |
| **Total** | | **124** |

All 124 functional requirements are owned by exactly one module. **No requirement is unassigned, and none is owned twice.**
