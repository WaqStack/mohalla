# Event Catalogue

**Stage 4 · Shehersaaz Community Platform** · Companion to `06-backend-modules.md` and ADR-014

Two distinct kinds of event. They are not interchangeable.

| | **Domain events** | **Realtime events** |
|---|---|---|
| Transport | `outbox` table → worker | Socket.IO → connected client |
| Durability | **Durable** — written in the producing transaction | **Ephemeral** — lost if nobody is listening |
| Purpose | Decouple modules; drive notifications | Deliver to an open app within 3 s |
| Guarantee | At-least-once, consumers idempotent | Best-effort; REST is the source of truth |

**A realtime event is never the only delivery mechanism.** Every one has a durable counterpart the client can fetch over REST (ADR-009).

---

## 1. Domain events

Written to `outbox` **in the same transaction as the business change** (ADR-014). Payloads carry identifiers, never personal data or message bodies.

| Event | Producer | Consumers | Payload | Requirement |
|---|---|---|---|---|
| `user.registered` | identity | — | `userId` | AUTH-FR-001 |
| `user.verified` | identity | — | `userId` | AUTH-FR-002 |
| `user.state_changed` | identity | notifications, messaging | `userId`, `from`, `to` | BR-035 |
| `session.revoked` | identity | — | `userId`, `reason` | ADR-008 |
| `profile.updated` | profile | search | `userId` | PROFILE-FR-003 |
| `social.followed` | social-graph | notifications | `followerId`, `followeeId` | SOCIAL-FR-001 |
| `post.created` | posts | notifications, search | `postId`, `authorId` | POST-FR-001 |
| `post.deleted` | posts | notifications, media, search | `postId` | POST-FR-007 |
| `engagement.liked` | engagement | notifications | `postId`, `actorId`, `authorId` | ENGAGE-FR-001 |
| `engagement.commented` | engagement | notifications | `commentId`, `postId`, `actorId` | ENGAGE-FR-002 |
| `engagement.replied` | engagement | notifications | `commentId`, `parentId`, `actorId` | ENGAGE-FR-003 |
| `message.sent` | messaging | notifications | `messageId`, `conversationId`, `senderId`, `recipientId`, **`isRequest`** | MSG-FR-002 |
| `message.request_created` | messaging | notifications | `conversationId`, `recipientId` | MSG-FR-005 |
| `event.created` | events | search | `eventId`, `creatorId` | EVENT-FR-001 |
| `event.rsvp_changed` | events | notifications | `eventId`, `userId`, `response` | EVENT-FR-004 |
| `event.changed` | events | notifications | `eventId`, `changedFields` | EVENT-FR-007 |
| `event.cancelled` | events | notifications | `eventId` | EVENT-FR-007 |
| `media.ready` / `media.rejected` | media | posts | `mediaId`, `ownerId` | ADR-013 |
| `safety.blocked` | safety | messaging, notifications, social-graph | `blockerId`, `blockedId` | SAFETY-FR-005 |
| `safety.reported` | safety | moderation | `reportId`, `targetType`, `targetId`, `severity` | SAFETY-FR-001 |
| `safety.content_auto_hidden` | safety | notifications, moderation | `targetType`, `targetId`, `authorId` | SAFETY-FR-004 |
| `moderation.decided` | moderation | notifications, audit | `caseId`, `decision`, `adminId` | ADMIN-FR-003/004 |
| `moderation.enforcement_applied` | admin-ops | identity, notifications, audit | `targetUserId`, `action`, `expiresAt` | ADMIN-FR-006/007 |
| `announcement.published` | admin-ops | notifications, feed | `announcementId`, `broadcast` | ADMIN-FR-009 |
| `account.deletion_requested` | settings | messaging, notifications, identity | `userId`, `scheduledErasureAt` | SET-FR-004 |
| `account.restored` | settings | — | `userId` | SET-FR-005 |
| `account.erased` | settings | all modules with an `AnonymisationContract` | `userId` | PRIV-007 |

### 1.1 Rules

1. **The producing module writes the outbox row in its own transaction.** If the business change rolls back, the event never existed.
2. **Consumers are idempotent.** At-least-once delivery means a consumer may see the same event twice; it must produce the same result.
3. **Payloads carry identifiers only.** No message body, no phone number, no email. A consumer that needs more reads it (PRIV-010).
4. **`message.sent` carries `isRequest`** so the notification pipeline can apply BR-027 without a second query. Getting this flag wrong would push-notify a stranger's message — the exact failure MSG-FR-005 exists to prevent.
5. **No consumer may fail a producer.** A push failure never rolls back a like.

---

## 2. Realtime events — Socket.IO

Namespace `/rt`. Authenticated at handshake with the session token **and re-checked on every event** — a revoked session is disconnected (ADR-009).

### Server → client

| Event | Payload | Purpose | Requirement |
|---|---|---|---|
| `message:new` | Full message object | Deliver within 3 s to an open app | MSG-FR-004, NFR-PERF-007 |
| `message:delivered` | `messageId`, `deliveredAt` | Sender's second tick | MSG-FR-009 |
| `message:read` | `conversationId`, `readAt` | Read receipt — **never emitted for a Message Request** | MSG-FR-009 |
| `unread:count` | `inbox`, `requests` | Badge. **Counts are separate** — a stranger cannot inflate the inbox badge | MSG-FR-003, BR-027 |
| `connection:state` | `ok` / `degraded` | Drives the offline indicator | NFR-AVAIL-002 |

### Client → server

| Event | Payload | Notes |
|---|---|---|
| `conversation:subscribe` | `conversationId` | Server verifies participation before joining the room |
| `conversation:unsubscribe` | `conversationId` | |
| `message:ack` | `messageId` | Marks delivered |

### 2.1 Rules

1. **Handshake authentication is not sufficient.** Every event re-checks the session and the actor's right to the conversation. Checking only at connect is the classic WebSocket authorization bypass.
2. **One room per user id**, not per device — multiple devices receive the same events (AUTH-FR-010 permits five).
3. **No realtime event is the sole delivery path.** On reconnect the client fetches messages since its last known server timestamp; the same `clientMessageId` prevents duplication (EDGE-021).
4. **Read receipts are suppressed for Message Requests** — reading a stranger's message must signal nothing (MSG-FR-009, BR-028).
5. **Requests never emit `message:new`** to the recipient; only the request count updates. Anything else would reintroduce the interruption BR-027 removes.

---

## 3. Job types — `pg-boss`

| Job | Trigger | Cadence | Requirement |
|---|---|---|---|
| `outbox.dispatch` | Continuous | Poll | ADR-014 |
| `push.send` | Notification created | On demand | NOTIF-FR-001 |
| `event.reminder` | RSVP Going | 24 h + 1 h before | EVENT-FR-008 |
| `suspension.expire` | Scheduled | Hourly | BR-034, EDGE-028 |
| `account.erase` | `scheduled_erasure_at` reached | Daily | PRIV-007 |
| `media.validate` | Upload completed | On demand | ADR-013 |
| `media.sweep` | Scheduled | Daily | §21 |
| `announcement.expire` | Scheduled | Daily | FEED-FR-002 |
| `session.prune` | Scheduled | Daily | ADR-008 |
| `notification.prune` | Scheduled | Daily | NOTIF-FR-002 |

**Every job is idempotent and safe to re-run.** `account.erase` additionally supports a dry-run mode, exercised in staging before it is ever enabled in production (ADR-019).
