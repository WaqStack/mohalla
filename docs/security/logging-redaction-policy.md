# Logging and Error Redaction Policy

**Per addendum §25.** Application logs and public CI logs must both be safe to read.

---

## Never log

Passwords · OTP codes · session tokens · `Authorization` headers · cookies · **mobile numbers**
· **email addresses** · dates of birth · private-message content · report notes · uploaded
document content · presigned URLs (they carry credentials) · object-storage credentials · full
external-provider responses containing identifiers.

## Do log

| Field | Why |
|---|---|
| **Correlation ID** | Ties a user-reported failure to its logs and, later, to `audit_log.correlation_id`, without identifying anyone |
| Safe internal event code | `job_completed`, `http_request`, `unhandled_error` |
| Redacted actor identifier | An opaque `UserId`, never a phone number or email |
| Outcome and duration | Operational signal with no personal content |
| Safe error classification | The stable `code` from the error catalogue, not raw driver text |

## Already implemented in the foundation

| Control | Where |
|---|---|
| Env validation prints **field names only, never values** | `apps/api/src/config/env.ts`, `apps/worker/src/config/env.ts` — a startup error must not leak a connection string |
| Structured JSON logger, correlation attached automatically | `apps/api/src/common/logging/structured.logger.ts` |
| Request logs strip the **query string** | `request-logging.interceptor.ts` — query strings are where identifiers and tokens end up |
| 5xx responses return a **fixed generic message**; detail is logged with the correlation ID only | `all-exceptions.filter.ts` |
| Readiness check returns the driver message but **never the connection string** | `database.service.ts` |
| Validation errors return field **paths**, never received values | `packages/validation/src/zod-validation.ts` |

**Tested:** `env.spec.ts` asserts a secret-looking malformed value never appears in the error;
`primitives.test.ts` asserts a rejected value is never echoed in an issue.

## Rule for Stage 6

Every module that logs an event involving a user must log the **opaque identifier and
correlation ID only**. A test must prove the sensitive field is absent from the log line —
redaction is asserted, not assumed.
