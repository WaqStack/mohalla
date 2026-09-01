# ADR-001 — Mobile framework: Kotlin + Jetpack Compose

**Status:** Accepted
**Date:** 1 September 2026
**Drivers:** D-01, D-02, D-03

## Context

Version 1 ships an Android application only (NFR-COMP-004). The device floor is API 26 on 2 GB RAM at 720x1280 (NFR-COMP-001/002), with a 4-second cold-start budget (NFR-PERF-003) and a 3-second feed render over 3G (NFR-PERF-001).

The hardest constraint is localization. LOCALE-FR-002 requires a language switch to take effect immediately, and LOCALE-FR-003 with BR-041 requires the entire interface to mirror — explicitly *not* merely right-aligned text. REL-002 gates release on this across every screen. RSK-004 already ranks RTL underestimation as a top project risk.

iOS is explicitly Phase 2 and out of scope.

## Requirements

LOCALE-FR-001/002/003/004/005 · BR-040/041 · NFR-USAB-004 · NFR-COMP-001/002 · NFR-PERF-003/005 · NFR-ACC-001/002/004 · MEDIA-FR-001 · SEC-004/028 · REL-002/008

## Options considered

### A — Kotlin + Jetpack Compose
Native. Layout direction resolves from configuration and can be overridden via `LocalLayoutDirection`. Locale change triggers activity recreation, which is the platform's expected and fast mechanism. Android's RTL support applies to the whole view system.

### B — Flutter + Dart
`Directionality` is an inherited widget; changing it rebuilds the subtree immediately with no restart. Flutter renders its own widgets, so mirroring is consistent by construction. Cross-platform if iOS is later approved.

### C — React Native + TypeScript
One language across mobile, backend, admin and contracts — a real productivity multiplier for two developers using AI agents, and the cheapest iOS path.

**Verified against official documentation, 1 September 2026:**
- `I18nManager.forceRTL()` and `allowRTL()` take effect *"on the next application start, not immediately"*. The documentation warns that forcing RTL *"requires a full app restart to take effect, which makes for a poor user-experience."*
- React Native **does** expose a per-view `direction` layout prop, `enum('inherit','ltr','rtl')`, with the root defaulting from locale.

So a runtime direction switch **is** achievable without `I18nManager`. The caveat is ecosystem convention: third-party components branch on `I18nManager.isRTL`, which would not flip under that approach. Navigation, gesture and list libraries would need auditing or avoiding across 61 screens.

## Decision

**Kotlin + Jetpack Compose is the recommended option after comparison.**

This is a comparative selection. All three options can build this product; React Native is **not** eliminated as impossible.

## Why

In order of weight:

1. **V1 is Android-only.** Cross-platform capability is unused in V1. Paying its complexity cost now requires demonstrated value that the approved scope does not provide.
2. **The device floor is hard.** API 26 on 2 GB with a 4-second cold-start budget is exactly where an additional runtime layer costs most.
3. **RTL is the top technical risk.** Compose carries the fewest unknowns, and REL-002 gates release on it.
4. **Two developers, iOS deferred.** Optimising V1 for a Phase 2 platform is the wrong trade.

**Flutter is the closest alternative** and would be stronger if iOS entered V1 — it matches Compose on RTL and rendering consistency. It loses on introducing a third language to a two-person team and on runtime overhead at the device floor.

**React Native remains viable.** It is not selected because its RTL path depends on avoiding an ecosystem convention across 61 screens, and that risk lands on RSK-004.

## Benefits
Smallest APK and lowest runtime overhead at the device floor; mature platform RTL; direct access to platform image, Keystore and accessibility APIs; Compose is very well represented in AI training data.

## Disadvantages
A second language alongside TypeScript. iOS would require a new UI layer. Compose recomposition needs care in long lists — mitigated by stable keys and paging.

## Security impact
Positive. `EncryptedSharedPreferences` / Keystore for session tokens (SEC-004); no JavaScript bundle to tamper with; SEC-028 log redaction is enforced in one language.

## Privacy impact
Neutral to positive. No third-party runtime that could collect telemetry, which supports PRIV-012.

## Operational impact
One Gradle lane in CI alongside the Node lane. Play Store signing is a human-only step.

## Cost impact
No licence cost. Bundled Urdu typeface must permit redistribution (DEP-013).

## Revisit trigger
iOS or a public web client enters an approved scope; or Compose is measured to miss NFR-PERF-003 on the reference device.
