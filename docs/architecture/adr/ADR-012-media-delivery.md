# ADR-012 — Media storage and delivery: S3-compatible storage behind a CDN

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-03

> **This is an architecture decision, not an SRS requirement.** The SRS mandates media storage and delivery, progressive loading, mandatory client-side compression and a 500 KB transmitted ceiling. It does not mandate a separate CDN product. The options below were evaluated before selecting.

## Context

Media in V1 is JPEG, PNG, WebP and PDF. No video, in any surface (BR-VID-001). Images are compressed on-device to under 500 KB before transmission (MEDIA-FR-001, NFR-PERF-005). Feed pages return 20 items (NFR-PERF-006), so media dominates bytes transferred. The audience is nationwide Pakistan on slow, expensive, intermittent mobile data.

Two distinct access classes exist:
- **Post and profile media** — visible to any authenticated user, since all V1 profiles are public (BR-VIS-001)
- **Conversation media** — must not be retrievable outside its conversation (MSG-FR-008)

## Options considered

| | **A · Direct from object storage** | **B · Storage behind CDN** | **C · Managed image service** |
|---|---|---|---|
| Latency from Pakistan | Bounded by bucket region; no edge | Edge-cached after first fetch | Edge delivery |
| Egress cost | Provider rate on every request | Usually lower at volume; origin fetches reduced | Highest per unit |
| Cacheability | Client cache only | High — media is immutable | High |
| Ops burden | Lowest — one service | One extra service | Lowest engineering |
| Private delivery | Presigned GET | Signed URLs / signed cookies | Provider-specific |
| Lock-in | Low | Low | **High** |

## Analysis

- **Media is immutable once promoted.** Objects are written under a random name and never rewritten (SEC-015). That is the ideal CDN cache profile — near-total hit rate after first fetch and no invalidation problem.
- **There is no major cloud region inside Pakistan.** Origin round-trip is therefore material for every image on every feed page, which bears directly on NFR-PERF-001's 3-second feed target.
- **Egress economics dominate.** With images capped at 500 KB and 20 items per page, media is the bulk of both bytes and cost, which is RSK-013.
- **Option C's transforms are not needed.** Compression already happens on-device, and only one derived variant is required — a feed thumbnail alongside the full-size viewer asset (MEDIA-FR-002).

## Decision

**Option B — S3-compatible object storage behind a CDN.**

**Option A is an accepted V1 fallback** if a CDN cannot be provisioned in time. It changes a URL-generation function and nothing else.

## Access control

| Class | Delivery | Reason |
|---|---|---|
| Post and profile media | CDN, long cache, unguessable object name | Public to authenticated users under BR-VIS-001; the object name is not the security control, but there is no secret to protect |
| **Conversation media** | **Signed, short-lived URLs; not CDN-cached across users** | MSG-FR-008 requires it to be unreachable outside the conversation |

## Benefits
Lower latency for repeat media; reduced egress; portable S3 API; the immutability profile makes caching trivially correct.

## Disadvantages
One more service and one more credential (SEC-025). A CDN in front of storage adds a signed-URL concern for conversation media — handled by bypassing shared caching for that class.

## Security impact
Random object names (SEC-015) and disabled directory listing. Conversation media is signed and short-lived. The CDN never fronts an authenticated API path.

## Privacy impact
The CDN sees requests for media objects. It must not receive user identifiers in URLs or query strings.

## Operational impact
Storage growth and CDN egress are monitored (NFR-SCAL-003) — the leading indicator for RSK-013.

## Cost impact
Storage plus egress are the largest recurring cost drivers. Bands only, no quotation: storage low, egress **medium and growth-sensitive**, CDN low-to-medium.

## Revisit trigger
Measured latency acceptable without a CDN, or egress economics inverting.
