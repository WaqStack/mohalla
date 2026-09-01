# 08 — API Architecture

**Stage 4 · Shehersaaz Community Platform (Mohalla — محلہ)**
Version 1.1 · Status: **Complete**
**Style:** REST (ADR-006) · **Contract:** `contracts/openapi-v1.yaml` · **Errors:** `contracts/error-catalogue.md`

---

## 1. Conventions

| Concern | Decision |
|---|---|
| **Versioning** | Path prefix `/api/v1`. A breaking change increments to `/api/v2`; both run during a deprecation window |
| **Namespaces** | `/api/v1/m/**` mobile · `/api/v1/a/**` admin · `/api/v1/auth/**` unauthenticated. **Separate namespaces because they have separate credential stores** (SEC-020) |
| **Authentication** | `Authorization: Bearer <opaque>` (ADR-008). **An admin token presented to `/m` fails, and a user token presented to `/a` fails** |
| **Transport** | HTTPS only. Plain HTTP is **refused, not redirected**, for API paths (SEC-017) |
| **Validation** | DTO validation at the transport edge; **every rule in SRS §12 re-enforced server-side** irrespective of the client (SEC-010) |
| **Pagination** | Keyset. `?limit=20&cursor=<opaque>`. `limit` capped at 20 (NFR-PERF-006) |
| **Time** | RFC 3339 UTC (`2026-09-01T09:41:00Z`). Clients render `Asia/Karachi` |
| **Language** | `Accept-Language: en \| ur`. Server-generated text follows it; **user content is never translated** |
| **Idempotency** | `Idempotency-Key` header on POST where a retry must not duplicate. Messages additionally carry `clientMessageId` in the body (EDGE-021) |
| **Correlation** | Every response carries `X-Correlation-Id`; every error body repeats it (SRS §16) |
| **Rate limits** | `X-RateLimit-Limit` · `X-RateLimit-Remaining` · `Retry-After` on 429 (SEC-005) |

### 1.1 Response envelope

Collections:
```json
{ "data": [ … ], "pageInfo": { "nextCursor": "…", "hasMore": true } }
```
Single resources return the object directly. **No envelope on single reads** — it adds nesting without benefit.

### 1.2 Error format

```json
{
  "error": {
    "code": "RESOURCE_UNAVAILABLE",
    "message": "This content is no longer available.",
    "fieldErrors": [],
    "correlationId": "018f3a2b-7c4e-7b1a-9f2d-3c5e8a1b4d6f"
  }
}
```

**Copy comes from the approved documents where specified.** `RESOURCE_UNAVAILABLE`'s message is the SRS §16 wording verbatim; validation messages are the SRS §12 strings.

**Never returned:** stack traces · framework or library names · SQL text · internal paths · whether a blocked, deleted or banned target exists · whether a phone number is registered · whether an account is banned (SEC-006, SEC-018).

---

## 2. The three response rules that carry privacy

These are not conventions. They are the API-level expression of the product's core privacy promises, and every endpoint obeys them.

**Rule 1 — One neutral unavailable state.**
Deleted, auto-hidden, blocked, banned and never-existed all return **`404 RESOURCE_UNAVAILABLE` with identical body and identical timing**. Any variation would leak the existence of a block (BR-025, UX-STATE-001).

**Rule 2 — No identifier ever leaves the identity boundary.**
No response schema in `/api/v1/m` contains `phone`, `email` or `dateOfBirth`. This is structural: the public projection is a distinct type that has no such fields (PRIV-003). Only `/api/v1/a/users/{id}` exposes them, and **that read is audited** (PRIV-008).

**Rule 3 — Authentication responses are uniform in content and timing.**
Wrong password, unknown number and banned account produce the same response and the same latency (SEC-006). Password reset returns the same acknowledgement whether or not the number exists (AUTH-FR-007).

---

## 3. API inventory

**86 endpoints.** ✅ *AUTH-API-012 (email registration) removed by OD-021 Option C.* `Auth` column: `—` public · `U` user session · `A` admin session.

### 3.1 Authentication — `/api/v1/auth`

| API ID | Requirement | Method | Path | Auth | Notes |
|---|---|---|---|---|---|
| AUTH-API-001 | AUTH-FR-001 | POST | `/register` | — | Uniform 202. Idempotency-Key required (EDGE-001) |
| AUTH-API-002 | AUTH-FR-002 | POST | `/otp/verify` | — | Consumes the challenge |
| AUTH-API-003 | AUTH-FR-003 | POST | `/otp/resend` | — | 60 s cooldown, 3/hour |
| AUTH-API-004 | AUTH-FR-005 | POST | `/login` | — | Returns session + account state |
| AUTH-API-005 | AUTH-FR-006 | POST | `/logout` | U | Current device only (BR-007) |
| AUTH-API-006 | AUTH-FR-007 | POST | `/password/forgot` | — | **Same response whether or not the number exists** |
| AUTH-API-007 | AUTH-FR-007 | POST | `/password/reset` | — | Invalidates **all** sessions |
| AUTH-API-008 | AUTH-FR-010 | POST | `/session/refresh` | U | Slides idle expiry |
| AUTH-API-009 | SET-FR-005 | POST | `/account/restore` | U | Within the 30-day grace |
| AUTH-API-010 | AUTH-FR-011 | POST | `/admin/login` | — | **Admin store only** (SEC-020) |
| AUTH-API-011 | AUTH-FR-011 | POST | `/admin/logout` | A | |

### 3.2 Profile — `/api/v1/m`

| API ID | Requirement | Method | Path | Auth |
|---|---|---|---|---|
| PROF-API-001 | PROFILE-FR-002 | GET | `/username/available?u=` | U |
| PROF-API-002 | PROFILE-FR-002 | POST | `/me/username` | U |
| PROF-API-003 | PROFILE-FR-001 | POST | `/me/profile` | U |
| PROF-API-004 | PROFILE-FR-004 | GET | `/me` | U |
| PROF-API-005 | PROFILE-FR-003 | PATCH | `/me/profile` | U |
| PROF-API-006 | PROFILE-FR-005 | GET | `/users/{id}` | U |
| PROF-API-007 | PROFILE-FR-008 | GET | `/users/{id}/posts` | U |
| PROF-API-008 | PROFILE-FR-010 | POST | `/me/photo` | U |
| PROF-API-009 | PROFILE-FR-011 | PUT | `/me/interests` | U |
| PROF-API-010 | POST-FR-006 | GET | `/categories` | U |

### 3.3 Social graph

| API ID | Requirement | Method | Path | Auth |
|---|---|---|---|---|
| SOC-API-001 | SOCIAL-FR-001 | PUT | `/users/{id}/follow` | U |
| SOC-API-002 | SOCIAL-FR-002 | DELETE | `/users/{id}/follow` | U |
| SOC-API-003 | SOCIAL-FR-003 | GET | `/users/{id}/followers` | U |
| SOC-API-004 | SOCIAL-FR-004 | GET | `/users/{id}/following` | U |
| SOC-API-005 | SOCIAL-FR-005 | GET | `/suggestions` | U |

`PUT`/`DELETE` rather than `POST` — follow is **idempotent by construction** (EDGE-015).

### 3.4 Posts, media & engagement

| API ID | Requirement | Method | Path | Auth |
|---|---|---|---|---|
| POST-API-001 | POST-FR-001 | POST | `/posts` | U |
| POST-API-002 | POST-FR-009 | GET | `/posts/{id}` | U |
| POST-API-003 | POST-FR-008 | PATCH | `/posts/{id}` | U |
| POST-API-004 | POST-FR-007 | DELETE | `/posts/{id}` | U |
| MED-API-001 | MEDIA-FR-001 | POST | `/media/upload-slot` | U |
| MED-API-002 | ADR-013 | POST | `/media/{id}/complete` | U |
| MED-API-003 | MEDIA-FR-003 | GET | `/media/{id}` | U |
| ENG-API-001 | ENGAGE-FR-001 | PUT | `/posts/{id}/like` | U |
| ENG-API-002 | ENGAGE-FR-001 | DELETE | `/posts/{id}/like` | U |
| ENG-API-003 | ENGAGE-FR-002 | POST | `/posts/{id}/comments` | U |
| ENG-API-004 | ENGAGE-FR-002 | GET | `/posts/{id}/comments` | U |
| ENG-API-005 | ENGAGE-FR-003 | POST | `/comments/{id}/replies` | U |
| ENG-API-006 | ENGAGE-FR-004/005 | DELETE | `/comments/{id}` | U |
| ENG-API-007 | ENGAGE-FR-007 | GET | `/posts/{id}/share-link` | U |
| ENG-API-008 | ENGAGE-FR-008 | GET | `/mentions/suggest?q=` | U |

### 3.5 Feed

| API ID | Requirement | Method | Path | Auth | Notes |
|---|---|---|---|---|---|
| FEED-API-001 | FEED-FR-001 | GET | `/feed/following` | U | Keyset |
| FEED-API-002 | FEED-FR-003 | GET | `/feed/discover` | U | Keyset |
| FEED-API-003 | FEED-FR-002 | GET | `/feed/featured` | U | **Independent endpoint** — renders before follow data (RSK-001) |
| FEED-API-004 | FEED-FR-005 | GET | `/feed/following?since=` | U | Prepend on refresh |
| FEED-API-005 | FEED-FR-007 | PUT | `/posts/{id}/save` | U | Could-have |
| FEED-API-006 | FEED-FR-007 | GET | `/me/saved` | U | Could-have |

`FEED-API-003` is separate **by requirement**, not by convenience — FEED-FR-002 is the cold-start guarantee.

### 3.6 Events

| API ID | Requirement | Method | Path | Auth |
|---|---|---|---|---|
| EVT-API-001 | EVENT-FR-001 | POST | `/events` | U |
| EVT-API-002 | EVENT-FR-005 | GET | `/events?scope=upcoming` | U |
| EVT-API-003 | EVENT-FR-004 | GET | `/events?scope=mine` | U |
| EVT-API-004 | EVENT-FR-006 | GET | `/events/{id}` | U |
| EVT-API-005 | EVENT-FR-004 | PUT | `/events/{id}/rsvp` | U |
| EVT-API-006 | EVENT-FR-004 | DELETE | `/events/{id}/rsvp` | U |
| EVT-API-007 | EVENT-FR-007 | PATCH | `/events/{id}` | U |
| EVT-API-008 | EVENT-FR-007 | POST | `/events/{id}/cancel` | U |
| EVT-API-009 | EVENT-FR-003 | GET | `/events/{id}/join-link` | U |

> **There is deliberately no `GET /events/{id}/attendees`.** EVENT-FR-004 permits a public count and states the attendee list is not shown in V1 (ARCH-CONFLICT-006, D-17). `EVT-API-004` returns `goingCount` and `interestedCount` only.
>
> **`EVT-API-009` error semantics are deliberately split**, so that a timing rule does not become an information leak:
>
> | Situation | Response | Why |
> |---|---|---|
> | Attendee responded Going, but it is more than 30 min before start | **`403 JOIN_LINK_NOT_YET_AVAILABLE`** with `availableAt` | A legitimate attendee needs to know *when* the control opens (EVENT-FR-003). Revealing this is safe — they can already see the event. |
> | Viewer has not responded Going | **`403 PERMISSION_DENIED`** | The event is visible to them; only the link is gated. |
> | Event hidden, deleted, cancelled-and-past, creator blocked, creator banned, or nonexistent | **`404 RESOURCE_UNAVAILABLE`** — identical body and timing in all six cases | The viewer must not be able to distinguish these. Returning a *different* error for a hidden event than for a nonexistent one would leak the existence of hidden content (BR-025). |
>
> **The rule:** a 403 is only ever returned for an event the requester can already see. Anything they cannot see is a 404, always the same one.

### 3.7 Messaging

| API ID | Requirement | Method | Path | Auth |
|---|---|---|---|---|
| MSG-API-001 | MSG-FR-003 | GET | `/conversations` | U |
| MSG-API-002 | MSG-FR-005 | GET | `/conversations/requests` | U |
| MSG-API-003 | MSG-FR-001 | POST | `/conversations` | U |
| MSG-API-004 | MSG-FR-003 | GET | `/conversations/{id}/messages` | U |
| MSG-API-005 | MSG-FR-002 | POST | `/conversations/{id}/messages` | U |
| MSG-API-006 | MSG-FR-005 | POST | `/conversations/{id}/accept` | U |
| MSG-API-007 | MSG-FR-005 | POST | `/conversations/{id}/decline` | U |
| MSG-API-008 | MSG-FR-009 | POST | `/conversations/{id}/read` | U |
| MSG-API-009 | MSG-FR-007 | POST | `/conversations/{id}/report` | U |

`MSG-API-005` requires `clientMessageId` in the body. A repeat returns `200` with the original message rather than creating a second (EDGE-020, EDGE-021).

**Realtime events** (Socket.IO, not REST): `message:new` · `message:delivered` · `message:read` · `unread:count` · `connection:state`.

### 3.8 Search & notifications

| API ID | Requirement | Method | Path | Auth |
|---|---|---|---|---|
| SRCH-API-001 | SEARCH-FR-001 | GET | `/search/people?q=` | U |
| SRCH-API-002 | SEARCH-FR-002 | GET | `/search/posts?q=` | U |
| SRCH-API-003 | SEARCH-FR-004 | GET | `/search/events?q=` | U |
| NOTF-API-001 | NOTIF-FR-002 | GET | `/notifications` | U |
| NOTF-API-002 | NOTIF-FR-002 | POST | `/notifications/read` | U |
| NOTF-API-003 | NOTIF-FR-002 | GET | `/notifications/unread-count` | U |
| NOTF-API-004 | NOTIF-FR-001 | POST | `/devices` | U |
| NOTF-API-005 | NOTIF-FR-001 | DELETE | `/devices/{token}` | U |
| NOTF-API-006 | NOTIF-FR-007 | GET | `/me/notification-preferences` | U |
| NOTF-API-007 | NOTIF-FR-007 | PUT | `/me/notification-preferences` | U |

**There is no recent-searches endpoint.** Recent searches live on the device and are never transmitted (PRIV-011).

Search failure returns **`503 SEARCH_UNAVAILABLE`, never an empty `data` array** (SEARCH-FR-003 E3).

### 3.9 Safety & settings

| API ID | Requirement | Method | Path | Auth |
|---|---|---|---|---|
| SAFE-API-001 | SAFETY-FR-001 | POST | `/reports` | U |
| SAFE-API-002 | SAFETY-FR-003 | GET | `/reports/reasons` | U |
| SAFE-API-003 | SAFETY-FR-005 | PUT | `/users/{id}/block` | U |
| SAFE-API-004 | SAFETY-FR-006 | DELETE | `/users/{id}/block` | U |
| SAFE-API-005 | SAFETY-FR-007 | GET | `/me/blocks` | U |
| SET-API-001 | SET-FR-001 | PUT | `/me/language` | U |
| SET-API-002 | SET-FR-002 | POST | `/me/password` | U |
| SET-API-003 | SET-FR-004 | POST | `/me/delete` | U |
| SET-API-004 | SET-FR-008 | GET | `/legal/{document}` | — |
| SET-API-005 | SET-FR-010 | GET | `/meta/version` | — |

`SAFE-API-001` returns the **same acknowledgement** on a repeat report, without revealing the tally (EDGE-023).

### 3.10 Admin — `/api/v1/a`

| API ID | Requirement | Method | Path | Auth |
|---|---|---|---|---|
| ADM-API-001 | ADMIN-FR-001/011 | GET | `/dashboard` | A |
| ADM-API-002 | ADMIN-FR-002 | GET | `/moderation/queue` | A |
| ADM-API-003 | ADMIN-FR-002 | GET | `/moderation/cases/{id}` | A |
| ADM-API-004 | ADMIN-FR-003 | POST | `/moderation/cases/{id}/restore` | A |
| ADM-API-005 | ADMIN-FR-004 | POST | `/moderation/cases/{id}/delete` | A |
| ADM-API-006 | ADMIN-FR-002 | POST | `/moderation/cases/{id}/close` | A |
| ADM-API-007 | MSG-FR-007 | GET | `/moderation/cases/{id}/conversation` | A |
| ADM-API-008 | ADMIN-FR-005 | GET | `/users?q=` | A |
| ADM-API-009 | ADMIN-FR-005 | GET | `/users/{id}` | A |
| ADM-API-010 | ADMIN-FR-006 | POST | `/users/{id}/suspend` | A |
| ADM-API-011 | ADMIN-FR-007 | POST | `/users/{id}/ban` | A |
| ADM-API-012 | ADMIN-FR-008 | POST | `/users/{id}/reinstate` | A |
| ADM-API-013 | ADMIN-FR-010 | POST | `/users/{id}/verification` | A |
| ADM-API-014 | ADMIN-FR-009 | GET | `/announcements` | A |
| ADM-API-015 | ADMIN-FR-009 | POST | `/announcements` | A |
| ADM-API-016 | ADMIN-FR-009 | DELETE | `/announcements/{id}` | A |
| ADM-API-017 | ADMIN-FR-012 | GET | `/audit` | A |

**Critical properties of the admin surface:**

- `ADM-API-004/005/006` carry a **`version`** field. A stale version returns `409 CASE_ALREADY_RESOLVED` naming **who resolved it and how** — not a generic conflict (EDGE-024).
- `ADM-API-007` is the **only** route to a private conversation, valid only for a case originating from `MSG-FR-007`, and it **writes an audit entry before returning** (PRIV-009).
- `ADM-API-009` is the only route exposing phone, email and DOB, and it **writes an audit entry** (PRIV-008, SEC-022).
- `ADM-API-010/011/012` **reject any target that resolves to an administrator**, unconditionally and server-side (BR-ADM-001, SEC-021).
- **There is no admin-management endpoint.** No create, disable or delete. Provisioning is a CLI (S2-CR-005). **No bootstrap route exists in any environment.**
- `ADM-API-017` is **read-only**. No `PATCH`, no `DELETE` — and the database privilege makes that structural (ADR-018).

---

## 4. Authorization enforcement

Every request passes three checks in order. **All three are server-side; none may be replaced by hiding a control** (SEC-009).

1. **Authentication** — valid, unrevoked session in the correct store. **A revoked session fails within one request cycle** (EDGE-010).
2. **Capability** — account state permits the action. A `SUSPENDED` user is refused every write with the reason and expiry (BR-034). Refusal happens here regardless of what the client rendered.
3. **Object-level** — the actor may touch *this* object: ownership for mutations, participation for conversations, and the bidirectional block predicate for every read (SEC-011, SEC-019).

**Check 3 is the one that IDOR bugs exploit**, so it is a shared guard composing `VisibilityPolicy` (§06 5) rather than a per-controller `if`.

---

## 5. Rate limits

Per SEC-005 and SAFETY-FR-009, applied **per account and per source address**.

| Endpoint class | Limit | Source |
|---|---|---|
| Registration | 3 / hour / IP | SEC-005 |
| OTP request | 3 / hour / number, 60 s cooldown | AUTH-FR-003 |
| OTP verify | 5 attempts, then 15-min lockout | AUTH-FR-002 |
| Login | 10 / 15 min, then 30-min lockout | SEC-007 |
| Password reset | 3 / hour / number | SEC-005 |
| Posts | 20 / day | SAFETY-FR-009 |
| Comments | 100 / day | SAFETY-FR-009 |
| Messages | 200 / day | SAFETY-FR-009 |
| Message requests | 10 / day / sender | MSG-FR-005 E3 |
| Follows | 100 / day | SAFETY-FR-009 |
| Events | 5 / day | EVENT-FR-001 E4 |
| Reports | 20 / day | SAFETY-FR-009 |

429 responses name the limit and the reset time concretely (SRS §16).

---

## 6. Deprecation

A `/v1` endpoint is never changed incompatibly. Additive changes only. Removal follows: mark deprecated in OpenAPI → `Deprecation` and `Sunset` headers → minimum one Play Store release cycle → removal. **Because the Android client is the only consumer and cannot be force-upgraded, no endpoint is removed while a supported release depends on it.**

---

## 7. Coverage

| Namespace | Endpoints |
|---|---|
| `/api/v1/auth` | 11 |
| `/api/v1/m` — profile, social, posts, media, engagement | 28 |
| `/api/v1/m` — feed, events, messaging | 24 |
| `/api/v1/m` — search, notifications, safety, settings | 22 |
| `/api/v1/a` | 17 |
| **Total** | **86 endpoints + 5 realtime events** |

Every endpoint maps to at least one requirement ID; the reverse mapping is in `18-requirements-architecture-traceability.md`.
