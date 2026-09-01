# Error Catalogue

**Stage 4 · Shehersaaz Community Platform** · Companion to `08-api-architecture.md` and `openapi-v1.yaml`

Every error response uses one shape:

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

`message` is **already localised** to `Accept-Language`. Clients display it directly; they must not map codes to their own copy, because SRS §12 and §16 fix the wording.

---

## 1. Codes

| HTTP | Code | Message (en) | When | Requirement |
|---|---|---|---|---|
| 400 | `MALFORMED_REQUEST` | Something went wrong on our side. Please try again. | Unparseable body | SEC-018 |
| 401 | `AUTHENTICATION_REQUIRED` | Please log in again. | Missing/invalid/revoked session | AUTH-FR-010, EDGE-010 |
| 401 | `INVALID_CREDENTIALS` | That number or password isn't right. | **Wrong password · unknown number · banned — all three** | **SEC-006** |
| 403 | `PERMISSION_DENIED` | You do not have permission to do that. | Actor may not perform this action | SEC-011 |
| 403 | `ACCOUNT_SUSPENDED` | Your account is limited until {date}. | Suspended user attempts a write | BR-034 |
| 403 | `JOIN_LINK_NOT_YET_AVAILABLE` | The join link opens 30 minutes before the event starts. | Early request **by an attendee who can already see the event**. Carries `availableAt`. **Never returned for an event the viewer cannot see** — that is a 404 | EVENT-FR-003 |
| 404 | `RESOURCE_UNAVAILABLE` | This content is no longer available. | **Deleted · auto-hidden · blocked · banned · never existed** | **BR-025, UX-STATE-001** |
| 409 | `USERNAME_TAKEN` | That username is taken. Try another. | Concurrent or existing claim | EDGE-007/008 |
| 409 | `CASE_ALREADY_RESOLVED` | {admin} already resolved this as {action}. | Stale `version` on a moderation decision | **EDGE-024** |
| 409 | `EVENT_TYPE_LOCKED` | This event already has responses, so its type can't change. | Type change after RSVPs | EVENT-FR-002 |
| 409 | `ALREADY_VERIFIED_INELIGIBLE` | Only organization accounts can be verified. | Verification on an Individual account | ADMIN-FR-010 |
| 422 | `VALIDATION_FAILED` | Please check the highlighted fields. | Field-level failure — see `fieldErrors` | SRS §12 |
| 422 | `AGE_BELOW_MINIMUM` | You must be 13 or older to use this app. | Age gate | BR-002 |
| 422 | `MEDIA_NOT_READY` | One of your attachments is still processing. | Post references non-`READY` media | ADR-013 |
| 422 | `UNSUPPORTED_FILE_TYPE` | Only PDF files up to 10 MB can be attached. | Content inspection failed | SEC-013, EDGE-014 |
| 429 | `RATE_LIMITED` | You are doing that too often. Try again in {n} minutes. | Any limit in §08 5 | SEC-005 |
| 429 | `OTP_LOCKED` | Too many attempts. Try again in 15 minutes. | 5 failed OTP attempts | AUTH-FR-002 |
| 500 | `INTERNAL_ERROR` | Something went wrong on our side. Please try again. | Unhandled | SEC-018 |
| 503 | `SEARCH_UNAVAILABLE` | Search isn't available right now. Please try again shortly. | **Never an empty result set** | **SEARCH-FR-003 E3** |
| 503 | `MAINTENANCE` | We'll be back at {time}. | Planned window | NFR-AVAIL-003 |

---

## 2. Codes that deliberately do not exist

Their absence is a security property, not an omission.

| Not returned | Why |
|---|---|
| `USER_BLOCKED_YOU` | Would disclose a block. BR-025 forbids it. Returns `RESOURCE_UNAVAILABLE`. |
| `ACCOUNT_BANNED` on login | Would confirm the account exists and is banned. Returns `INVALID_CREDENTIALS`. |
| `PHONE_NOT_REGISTERED` | Enumeration. Password reset returns the same acknowledgement either way. |
| `CONTENT_UNDER_REVIEW` to a non-author | Would reveal a moderation state. Returns `RESOURCE_UNAVAILABLE`. |
| `EVENT_HIDDEN` / `CREATOR_BLOCKED` on a join-link request | Would distinguish a hidden event from a nonexistent one. Both return `RESOURCE_UNAVAILABLE` with identical timing. |
| `REPORT_ALREADY_FILED` | Would let a reporter infer the tally. Returns the normal acknowledgement. |
| Any code naming a framework, table or file | SEC-018. |

---

## 3. Field errors

```json
{ "error": { "code": "VALIDATION_FAILED", "message": "Please check the highlighted fields.",
  "fieldErrors": [ { "field": "username",
    "message": "Usernames can use letters, numbers and underscores, and must start with a letter." } ],
  "correlationId": "…" } }
```

`message` per field is the exact SRS §12 string in the requested language. **The submitted value is never echoed back and never logged** — it may be personal (SRS §16).

---

## 4. Logging

| Returned to client | Written to logs |
|---|---|
| Code, localised message, correlation ID | Full stack trace, request context, correlation ID |
| Field names only | Field names only — **never values** |
| Nothing about existence | Resource type and id |
| Concrete retry time | User, endpoint, limit breached |

**Never logged in any circumstance:** passwords · OTP codes · session tokens · message bodies · search query text · phone · email · date of birth (PRIV-010, SEC-002, SEC-028).
