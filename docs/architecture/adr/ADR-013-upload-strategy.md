# ADR-013 — Upload strategy: presigned upload to quarantine, then validate and promote

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-08

## Context

Two requirements pull in opposite directions.

**SEC-013** requires file type to be determined by **inspecting content**, never by trusting the extension or the client-declared MIME type, and requires executable content to be rejected in every upload path. EDGE-014 makes it concrete: a non-PDF renamed `.pdf` must be rejected.

**Cost and performance** favour uploading straight from the device to object storage, so image bytes do not traverse the API twice — which matters given D-03 and RSK-013.

A naive presigned upload satisfies the second and defeats the first.

## Options considered

**A — Client → API → storage.** The API inspects content before writing. Correct, but every byte crosses the API, doubling bandwidth and occupying request handlers.

**B — Client → presigned URL → storage, no inspection.** Cheap and fast. **Violates SEC-013.** Rejected.

**C — Hybrid: presigned upload into a quarantine prefix, worker validates, then promote.**

## Decision

**Option C.**

## Security boundary — stated explicitly

| Property | Guarantee |
|---|---|
| **Quarantine objects are private** | The quarantine prefix has its own access policy. It is **never** fronted by the CDN and has no public URL. A guessed quarantine key returns nothing. |
| **The client cannot choose the final key** | The presigned URL targets a server-chosen quarantine key; the final served key is generated **server-side at promotion** and is unrelated to both (SEC-015). |
| **Content type is verified from bytes** | Magic-byte inspection of the stored object. The extension and the client-declared MIME type are ignored entirely (SEC-013). |
| **Size and dimensions rechecked server-side** | Declared values at slot request are advisory. The worker re-measures the actual object and rejects on mismatch (SEC-012, MEDIA-FR-005). |
| **Failed files are deleted** | A rejected object is removed from quarantine, not left to accumulate. |
| **Approved objects are promoted** | Copied to the served prefix under the random final key, then the quarantine copy is deleted. |
| **A post cannot expose media before `READY`** | Enforced by a trigger on `post_media`, not by controller logic. |

## Media state machine

```
PENDING_UPLOAD ──client completes──► PROCESSING ──inspection passes──► READY
      │                                   │
      └──24h sweep──► deleted             └──inspection fails──► REJECTED ──► deleted
```

`PENDING_UPLOAD` — slot issued, bytes not yet confirmed.
`PROCESSING` — bytes in quarantine, inspection queued or running.
`READY` — inspected, promoted, referenceable by a post.
`REJECTED` — failed inspection; object already deleted.

## PDF safety — CONDITIONAL, with a Technical Lead gate

✅ **OD-023 REVISED AND APPROVED 1 September 2026. The earlier proposal — "magic-byte only, no malware scanning" — was NOT approved and is withdrawn.**

🟦 **SEC-013 requires executable content to be rejected from every upload path.** A file is not safe merely because it begins with a valid PDF signature. **A Should feature may not weaken a Must security requirement.**

### Required pipeline before PDF may ship

```
upload -> PRIVATE quarantine -> type/content inspection
       -> PDF STRUCTURAL VALIDATION + ACTIVE-CONTENT REJECTION
       -> READY | REJECTED -> final delivery under a random key
```

### Minimum bar — all mandatory

| # | Requirement |
|---|---|
| 1 | **Verify actual PDF structure**, not the extension or signature alone — parse the document and confirm it is well-formed |
| 2 | **Reject malformed files** — a parser failure is a rejection, never a pass-through |
| 3 | **Reject detectable embedded executable or active content** — JavaScript actions, launch actions, embedded executables |
| 4 | **Quarantine objects never exposed** — no public URL, never CDN-fronted |
| 5 | **Final object keys randomised** (SEC-015) |
| 6 | **10 MB enforced server-side**, re-measured from the stored object |
| 7 | **Documents open in the device viewer** (MEDIA-FR-004) — the app never renders arbitrary PDFs |

### ✅ Production gate

**Before PDF is enabled in production, the Technical Lead must approve the selected inspection/sanitisation capability.** The capability is evaluated during EPIC-06 and recorded here.

### ✅ If no practical safe mechanism fits V1

**CUT PDF ATTACHMENT FROM V1.**

POST-FR-005, MEDIA-FR-003 and MEDIA-FR-004 are **Should**, so removal does not block the core MVP. **SEC-013 is not weakened to preserve a Should feature** — not negotiable at implementation time.

Images (JPEG, PNG, WebP) are unaffected and remain **Must**.

## Flow

1. Client requests an upload slot; server validates declared size and count against §12 limits and returns a presigned URL scoped to a **quarantine** prefix and a `media` row in state `PENDING`
2. Client uploads directly to storage
3. Client notifies the API that the upload finished
4. **Worker inspects the object's actual content** (magic bytes), verifies it is JPEG, PNG, WebP or PDF, verifies size, and rejects anything executable
5. On pass: object is moved to the served prefix under a **random name unrelated to the original filename** (SEC-015); a thumbnail variant is derived for images; state becomes `READY`
6. On fail: object is deleted; state becomes `REJECTED`; the client is told which file failed, leaving other attachments untouched (EDGE-013)
7. **A post may only reference media in state `READY`** — enforced by a foreign-key check at post-creation time

## Why

This is the only arrangement that satisfies SEC-013 and keeps bytes off the API path. Quarantine means an unvalidated object is never served: the served prefix and the quarantine prefix have different access policies, so even a guessed quarantine URL returns nothing publicly.

Step 7 is what prevents a race where a post references a file that later fails validation.

## Orphan handling

Uploads abandoned before step 3, and `PENDING_UPLOAD`/`PROCESSING`/`REJECTED` rows older than 24 hours, are swept daily. Media whose post is deleted is swept. Media belonging to an erased account is deleted at day 30 (PRIV-007).

## Benefits
SEC-013 satisfied by content inspection; bytes bypass the API; per-file retry without re-uploading successful files (EDGE-013); one clear place where validation happens.

## Disadvantages
Two-step upload with more moving parts; a brief window where an object exists but is unusable; the worker must be running for uploads to complete — monitored, with a queue-depth alert.

## Security impact
Strongly positive. Content inspection, executable rejection, random object naming, directory listing disabled, quarantine isolation, and **all limits re-enforced server-side irrespective of what the client permitted** (SEC-012, MEDIA-FR-005).

## Privacy impact
Original filenames are discarded; the stored name is not derivable from the user, the post, or the original name.

## Operational impact
One worker job type; quarantine bucket lifecycle rule as a backstop.

## Cost impact
Lower than Option A — image bytes cross the network once.

## Revisit trigger
Validation latency becomes user-visible, which would argue for inline inspection of small images only.
