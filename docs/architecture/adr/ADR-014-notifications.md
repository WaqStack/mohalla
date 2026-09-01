# ADR-014 — Notifications: durable records first, push as best-effort

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** NOTIF-FR-001…007

## Context

NOTIF-FR-001 states that a user who declines the OS push permission must lose nothing but push — *"notifications still accumulate in the in-app centre, so nothing is lost."* PRIV-015 requires that declining push degrades no other function. NOTIF-FR-002 requires an in-app centre with a 90-day retention and requires notifications whose target was deleted to be **removed**, not left dangling.

Two rules constrain delivery hard:
- **BR-027 / NOTIF-FR-004 — a Message Request never generates a push notification.**
- **NOTIF-FR-003 — likes on the same post batch above 5 within an hour into one summary.**

## Decision

**Two separate systems.** A durable in-app notification record is the source of truth; push is a best-effort projection of it.

```
Business transaction
  └─ writes domain change + outbox row   ← SAME transaction
        └─ worker reads outbox
              └─ creates notification record   ← durable, source of truth
                    └─ eligibility check (preferences · block · request rule)
                          └─ localised payload in the RECIPIENT's language
                                └─ push worker → FCM → Android deep link
```

## Why the outbox is in the same transaction

If the notification were created after commit, a crash in between would lose it silently. Writing the outbox row inside the business transaction makes the notification exactly as durable as the event that caused it. `pg-boss` on PostgreSQL makes this one transaction (ADR-010).

## Eligibility, applied in order

1. Never notify a user of their **own** action (NOTIF-FR-003)
2. Never notify **across a block**, in either direction (BR-025)
3. **Message Requests produce no push** (BR-027) — the in-app request count still updates
4. Apply the user's per-category preference; **preferences gate push only** — the in-app centre always records everything (NOTIF-FR-007)
5. Apply like-batching above 5 per post per hour
6. Render the template in the **recipient's** stored language (LOCALE-FR-006); **user-generated content inside the notification is never translated**

## Device tokens
Multiple devices per user. Tokens registered on login and permission grant; removed on logout; **removed automatically when FCM reports them invalid**. Token registration is not a precondition for anything else.

## Deleted targets
When a post, comment or event is deleted, notifications referring to it are deleted, so the centre never offers a dead link (NOTIF-FR-002).

## Retention
90 days for notification records; a daily job prunes older rows.

## Failure behaviour
FCM outage is invisible to the user — records accumulate in the centre. Push jobs retry with backoff and then dead-letter; dead-letter depth is alerted (§33). **A push failure never fails the originating business transaction.**

## Benefits
Nothing is lost when push is declined or FCM is down; one eligibility path; language correctness centralised.

## Disadvantages
Two write paths per event; outbox and notification tables grow — both pruned.

## Security impact
Push payloads carry the minimum needed for the deep link. **Message previews are included per NOTIF-FR-004, and it is documented that these appear on lock screens** — a residual risk accepted by the requirement.

## Privacy impact
Payloads carry no phone number, email or date of birth. Message Requests are silent by design, which is a privacy feature, not an omission.

## Operational impact
Two worker job types; FCM credentials per environment.

## Revisit trigger
Push volume outgrowing single-worker throughput.
