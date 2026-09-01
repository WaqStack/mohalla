# 04 — Mobile Application Architecture

**Stage 4 · Shehersaaz Community Platform** · Version 1.1 · Status: **Complete**
**Platform:** Android · Kotlin · Jetpack Compose · `minSdk 26` (ADR-001)


> **Classification legend — used throughout Stage 4 (Guardrail 9)**
>
> | Marker | Meaning |
> |---|---|
> | 🟦 **REQUIREMENT** | Approved in the SRS, Product Scope or UI/UX specification. Not negotiable at this stage. |
> | 🟩 **ARCHITECTURE** | A decision made in Stage 4. Reversible on evidence; recorded in an ADR. |
> | 🟨 **PROPOSED DEFAULT** | A value the approved documents left open. Safe to build; changeable by instruction. |
> | 🟥 **PROPOSED PRODUCT CHANGE** | **Not approved.** Requires product-owner sign-off. Recorded in `17-open-decisions.md`. |


---

## 1. Constraints that shape the client

| 🟦 Requirement | Consequence |
|---|---|
| NFR-COMP-001 — API 26+ | No API-27+-only capability without a fallback |
| NFR-COMP-002 — 2 GB RAM, 720×1280 | Bounded lists, recycled media, no large in-memory bitmaps |
| NFR-PERF-003 — 4 s cold start | Minimal startup work; no blocking network before first paint |
| NFR-PERF-001 — 3 s feed on 3G | Featured renders first; skeletons; progressive images |
| NFR-PERF-005 — no image over 500 KB | **On-device compression is mandatory before any byte leaves** |
| LOCALE-FR-002/003 — instant switch, full mirroring | Logical properties only; no physical `left`/`right` anywhere |
| NFR-ACC-001 — 14sp minimum, respects system scaling | Layouts must survive 130% font scale |
| SET-FR-006 — no cached personal content after logout | Cache clearing is a requirement, not housekeeping |

---

## 2. Structure

```
apps/mobile/
  core/
    design/        91 tokens generated from packages/design-tokens
    ui/            48 components from UI/UX §18
    network/       Retrofit + interceptors (auth, correlation, language)
    storage/       EncryptedSharedPreferences · Room cache · drafts
    localization/  generated from packages/localization
  feature/
    auth/ setup/ home/ search/ create/ events/ messaging/
    profile/ settings/ safety/
  navigation/
```

🟩 **ARCHITECTURE** — Feature modules mirror the backend's 15 modules and the UI/UX screen namespaces, so a task can be scoped as *"UX-MSG-003 + MSG-FR-004"* and touch one directory. This is what makes AI-agent boundaries enforceable on the client too.

**State:** unidirectional. `ViewModel` exposes immutable state; the UI emits events. **No business rule lives on the client** — it validates for feedback only, and the server re-validates everything (SEC-010).

---

## 3. Right-to-left — the highest-risk area

🟦 **REQUIREMENT** — LOCALE-FR-003, BR-041, REL-002. RSK-004 ranks this the top technical risk.

🟩 **ARCHITECTURE — five enforced rules:**

1. **Logical properties only.** `start`/`end`, never `left`/`right`. **A lint rule fails the build** on a physical direction property in a layout.
2. **Locale change recreates the activity.** The platform's own mechanism; fast, and it re-resolves every layout direction. State is preserved through `SavedStateHandle` so nothing is lost.
3. **Directional assets mirror automatically** via `autoMirrored`; non-directional assets (logo, tile motif) are explicitly excluded from mirroring.
4. **Text direction follows content, not the interface.** A mixed Urdu/English/Roman post renders each run correctly regardless of the active language (LOCALE-FR-005).
5. **Two line-height tokens per type token.** Urdu Naskh needs ≈1.2× Latin. Vertical padding is specified so a component's height is identical in both languages — **which is what stops screens reflowing on switch**.

🟩 **The build order rule:** the first production screen is implemented and validated in **both** directions before the second is started. **Building all English screens first and retrofitting RTL is prohibited** — it is precisely how RSK-004 materialises.

**Fonts** — Noto Naskh Arabic for Urdu interface text; Noto Nastaliq Urdu for display only, in four places, never below 18sp. Both bundled, not system-dependent (LOCALE-FR-004, DEP-013).

---

## 4. Session and secure storage

| Concern | 🟩 Decision |
|---|---|
| Token storage | `EncryptedSharedPreferences` backed by Keystore (SEC-004) |
| Transport | `Authorization: Bearer`, TLS only, certificate validation never disabled |
| 401 handling | One silent refresh attempt; on failure, sign out and clear cache |
| Revocation | Server-driven. A revoked session fails the next request; the client signs out (EDGE-010) |
| Logout | Server call, then **clear tokens, Room cache, drafts and image cache** (SET-FR-006) |
| Logging | 🟦 SEC-028 — never log message content, phone numbers or tokens, in any build |

---

## 5. Degraded network — not offline mode

🟦 **REQUIREMENT** — NFR-AVAIL-002. 🟦 **Out of scope:** full offline synchronisation.

| Supported | Not built |
|---|---|
| Show previously cached feed, profiles, conversations | Offline write queue beyond a single draft |
| Clear offline indicator | Conflict resolution |
| Network-dependent writes disabled with explanation | Background sync |
| Local post draft preserved (POST-FR-001 A2) | Offline media upload queue |
| Device-only recent searches (PRIV-011) | Server-side search history |

🟩 **Cache invalidation is a privacy control, not a performance one:**

| Event | Action |
|---|---|
| Logout | **Clear everything** — SET-FR-006 |
| Block or unblock | **Clear feed, profile and search caches immediately** — stale content must not survive a permission change (SEC-019) |
| Account state change | Clear all |
| TTL | 🟨 **PROPOSED DEFAULT** — 5 minutes for feed and profile payloads. Short deliberately: a longer TTL risks showing content across a block |
| Media | Cached by immutable object key — never stale (ADR-012) |

---

## 6. Optimistic updates

🟦 **REQUIREMENT (ENGAGE-FR-001)** — on failure the interface reverts to the true server state rather than showing an optimistic value indefinitely.

| Action | Optimistic | On failure |
|---|---|---|
| Like | Instant, no animation (motion token `instant`) | Revert count and state; brief toast |
| Follow | Instant state change | Revert |
| Message send | Bubble in `SENDING` | Mark **failed with retry**; never silently dropped (MSG-FR-002) |
| RSVP | Instant | Revert |
| Post publish | **Not optimistic** — upload can fail, so the composer waits | Text preserved, per-file retry (EDGE-011/013) |

🟩 Post publication is deliberately excluded from optimism: EDGE-011 requires that an interrupted upload creates no post and loses no text.

---

## 7. Media on device

🟦 MEDIA-FR-001 · NFR-PERF-005 — compress before upload; never transmit above 500 KB.

Longest edge 1,600 px, quality stepped down until under 500 KB. 🟩 **If compression fails, the upload is refused rather than sending the original** — the requirement is a ceiling, not a target. Upload then follows ADR-013: presigned URL → private quarantine → server inspection → promotion.

---

## 8. Push

🟦 NOTIF-FR-001 · PRIV-015 — permission requested contextually; declining degrades **only** notifications.

🟩 Token registered after login and on permission grant; removed on logout; refreshed on FCM rotation. Deep links route to the causing item; a notification whose target was deleted is absent from the centre (NOTIF-FR-002). **Message Requests never produce a push** (BR-027).

---

## 9. Errors and crash reporting

Users see the localised `message` from the error envelope, plus a correlation ID they can quote (SRS §16). 🟦 **SEC-018** — no technical detail is ever surfaced.

Crash reporting captures device model, Android version and stack trace. 🟩 **A redaction layer runs before transmission** and strips anything resembling a phone number, email, token or message body (PRIV-010, SEC-028). Target: 98% crash-free sessions (NFR-OBS-002).
