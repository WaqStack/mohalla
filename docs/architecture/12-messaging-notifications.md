# 12 — Messaging & Notifications

**Stage 4 · Shehersaaz Community Platform** · Version 1.1 · Status: **Complete**
**Diagrams:** `messaging-flow.mmd` · `notification-flow.mmd` · **Decisions:** ADR-009, ADR-014

> 🟦 **REQUIREMENT** approved · 🟩 **ARCHITECTURE** decision · 🟨 **PROPOSED DEFAULT** changeable · 🟥 **PROPOSED PRODUCT CHANGE** not approved

---

## 1. Transport split

| REST | Realtime (Socket.IO) |
|---|---|
| Conversation list · history · request list · conversation creation · reporting · pagination | New message · delivery ack · read receipt · unread count · connection state |

🟩 **REST is the source of truth. Realtime is an accelerator.** Every realtime event has a durable REST counterpart, so a missed socket event costs latency, never data.

---

## 2. Idempotency — the core guarantee

🟦 EDGE-020 · EDGE-021 · MSG-FR-002/004

1. The **client** generates `clientMessageId` (UUIDv7) **before** sending
2. `UNIQUE (conversation_id, client_message_id)`
3. Server **persists before acknowledging**
4. A retry `ON CONFLICT DO NOTHING` returns the original row
5. Ordering by **server** timestamp — both participants see one order
6. **The polling fallback reuses the identical id**, so switching transport cannot duplicate

🟩 **Deduplication lives in PostgreSQL, never in the transport.** This is deliberate and must survive realtime scaling — ADR-009 makes re-verifying it a mandatory review item when a pub/sub adapter is introduced.

---

## 3. Message Requests

✅ **APPROVED — OD-022, 1 September 2026: MSG-FR-005 is promoted from Should to MUST.**

🟦 **REQUIREMENT** — MSG-FR-005 *(now Must)*, BR-027, BR-028, NOTIF-FR-004.
🟩 **ARCHITECTURE** — `request_state` on `conversation_participants`, **per participant**.

**On the Must critical path and protected from the cut order.** The contradiction is closed: NOTIF-FR-004 (Must) no longer depends on a Should.

🟩 Per-participant state is what makes the behaviour possible: the recipient holds `PENDING` while the sender sees an ordinary thread, so a decline is **invisible** (BR-028).

| Rule | Enforcement |
|---|---|
| First message from a non-follower → request | `request_state = PENDING` on the recipient's row |
| **Never a push notification** | `message.sent` carries `isRequest`; the pipeline drops push (BR-027) |
| Reading signals nothing | **No read receipt is emitted for a request** (MSG-FR-009) |
| Decline is silent | State change only; **no event to the sender** |
| Recipient follows later | Pending request auto-promotes to the inbox (MSG-FR-005 A3) |
| Rate limit | 🟨 10 new requests per sender per day |

🟩 **OD-022 is decided — this is now a Must and is not cuttable.** The per-participant design that made it cheap to retain is now simply the design.

---

## 4. Blocking mid-conversation

🟦 EDGE-019 · MSG-FR-006 · BR-025

Blocker's side: `hidden_at` set; the conversation leaves their inbox. Blocked side: sends **refused, with no disclosure** — from their view the thread simply receives no replies. History retained; unblocking restores it intact (SAFETY-FR-006).

---

## 5. Connection lifecycle

Authenticated at handshake with the same opaque session token **and re-checked on every event** — a revoked session is disconnected mid-stream (BR-035). One room per user id supports up to five devices. Heartbeat detects dead sockets; on reconnect the client fetches messages since its last known server timestamp.

🟩 **Fallback:** if realtime is unavailable the client polls the REST history endpoint with the same idempotency key. Slower, never duplicating.

---

## 6. Notifications

🟦 NOTIF-FR-001…007 · LOCALE-FR-006 · 🟩 ADR-014

```
business transaction + outbox row   ← ONE transaction
   → worker → durable notification record   ← source of truth
       → eligibility → localised payload → FCM → deep link
```

🟩 **The outbox is written in the producing transaction.** A crash between commit and enqueue cannot lose a notification.

### Eligibility, in order

1. Never notify the actor of their own action
2. **Never notify across a block**, either direction
3. **Message Requests produce no push** (BR-027)
4. Per-category preference — 🟦 **gates push only**; the in-app centre always records everything (NOTIF-FR-007)
5. Batch >5 likes on one post within an hour into a summary (NOTIF-FR-003)
6. Render in the **recipient's** language; 🟦 **user content is never translated**

### Delivery

Multiple devices per user. Invalid tokens removed on FCM report. Retry with backoff, then dead-letter with an alert. 🟩 **A push failure never fails the originating transaction.**

🟦 **NOTIF-FR-001** — a user who declines push loses nothing; records accumulate in-app. FCM outage is invisible.

**Retention** — 90 days; notifications whose target is deleted are **removed**, never left to navigate nowhere (NOTIF-FR-002).

🟦 **Accepted residual risk** — NOTIF-FR-004 requires a message preview in the push payload, which appears on lock screens. Documented in `10` §1 rather than hidden.
