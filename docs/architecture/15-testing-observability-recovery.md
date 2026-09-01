# 15 — Testing, Observability & Recovery

**Stage 4 · Shehersaaz Community Platform** · Version 1.1 · Status: **Complete**

> 🟦 **REQUIREMENT** approved · 🟩 **ARCHITECTURE** decision · 🟨 **PROPOSED DEFAULT** changeable · 🟥 **PROPOSED PRODUCT CHANGE** not approved

---

## 1. Test architecture

| Level | Covers | Runs |
|---|---|---|
| Unit | Pure functions, transliteration, validators | Every commit |
| **Domain** | 49 business rules in isolation | Every commit |
| **Database integration** | Constraints, triggers, transactions, **race conditions** | Every PR |
| API | Endpoint contract, status codes, error shapes | Every PR |
| Contract | Generated clients match OpenAPI | Every PR |
| Realtime | Connection, auth, delivery, **idempotency** | Every PR |
| Worker | Outbox, push, reminders, **erasure** | Every PR |
| Mobile component | Compose components, **both directions** | Every PR |
| **Android E2E** | 12 flows, both languages | Nightly + release |
| Admin E2E | 9 screens, moderation loop | Nightly + release |
| Security | Authorization, enumeration, upload, SSRF | Every PR |
| Accessibility | Contrast, targets, labels, font scaling | Every PR |
| **RTL** | Screenshot comparison, all major screens | Every PR |
| Performance | Feed on throttled 3G, cold start | Release |
| **Backup restore** | 🟦 **REL-007 — before launch, then quarterly** | Scheduled |
| Smoke | Post-deploy | Every deploy |

---

## 2. The seven mandatory integration tests

🟦 **These are release gates.** Each targets a rule where a silent failure would be severe and would not surface in ordinary use.

### A · Block privacy — the hardest property in the product
A blocks B. **B must be unable to infer the block through any of:**
profile endpoint · post endpoint by direct id · follow attempt · message attempt · search by exact username · comment visibility · feed · event visibility · follower and following lists · mention suggestions · notification delivery.
**Assertion:** every path returns the **identical** `404 RESOURCE_UNAVAILABLE`, with response times within a tolerance band. *(BR-025, SEC-019, PRIV-013)*

### B · Session revocation
Suspend, ban and delete in three runs. Replay a previously valid session immediately.
**Assertion:** rejected on the **next** request, all devices, every time. *(BR-035, EDGE-010)*

### C · Report threshold race
Fire the threshold-reaching reports **concurrently** from distinct users.
**Assertion:** exactly one state transition · exactly one moderation case · **no automatic deletion** · count exactly at threshold. Repeat for events at 2. *(SAFETY-FR-004, BR-032, BR-044, EDGE-023)*

### D · Moderator collision
Two admins submit decisions on one case concurrently.
**Assertion:** exactly one succeeds; the other receives `409` **naming who resolved it and how**; one audit entry. *(EDGE-024)*

### E · Message idempotency
Submit the same `clientMessageId` repeatedly **and concurrently**; then again over the polling fallback.
**Assertion:** exactly one stored message · exactly one logical notification · one rendering. *(EDGE-020, EDGE-021)*

### F · Deletion lifecycle
Request → immediate deactivation → restore during grace → expiry → erasure → anonymisation → conversation behaviour.
**Assertion:** profile gone immediately; sessions revoked; posts remain as "Deleted User"; restore at day 29 succeeds and day 31 fails; erasure removes personal data; **counterpart retains their conversation copy**; **restore and erasure cannot interleave**. *(SET-FR-004/005, BR-009/046, PRIV-007, EDGE-029/030)*

### G · RTL end-to-end
**At least one complete E2E route through every major module in Urdu/RTL.**
**Assertion:** no clipping, no overlap, no untranslated string, navigation mirrored, mixed-script content correct, layouts intact at 130% font scale. *(LOCALE-FR-003, BR-041, REL-002)*

---

## 3. Prototype flows as test inputs

🟦 **ARCH-CONFLICT-009 applies here.** Eleven of the twelve prototype flows are behavioural references. **P-12 in the prototype is "Delete account", not "Admin moderation".**

| Flow | Source of truth for tests |
|---|---|
| P-01…P-11 | Prototype behaviour + SRS acceptance criteria |
| **P-12 Admin moderation** | 🟦 **UI/UX §27 and SRS §10.14 only — the prototype has no admin screens** |
| Account deletion | SET-FR-004/005 + prototype `del` screen |

---

## 4. Observability

**Logs** — structured, correlation ID on every entry, 🟨 30-day retention.
🟦 **Never logged:** passwords · OTP codes · session tokens · message bodies · search query text · phone · email · DOB (PRIV-010, SEC-002, SEC-028). Redaction runs **before** write, not as a filter afterwards.

**Monitored** — API error rate · latency p50/p95/p99 · database CPU, connections, slow queries · realtime connections and delivery failures · push delivery failures · **SMS/OTP failures** · upload failures · **moderation queue size and oldest item age** · storage growth · backup status · crash-free sessions.

**Alerts** — API error rate > 🟨 2% for 5 min · p95 > 800 ms for 10 min (NFR-PERF-002) · database connections > 80% · **queue depth or dead-letter growth** · **backup failure** · storage > 80% · **moderation queue oldest item > 24 h** (the SRS target for review) · crash-free < 98% (NFR-OBS-002).

🟩 **Moderation queue age is monitored as an operational metric** because A3 — that someone reviews it daily — is a **Severe** assumption. If nobody does, the platform becomes unsafe or over-censored, and monitoring is the only early warning.

---

## 5. Backup and recovery

🟦 **SEC-026** — daily automated, stored separately, **restore tested before launch**. 🟦 **REL-007** gates release on a successful restore into a clean environment.

🟨 **PROPOSED** — RPO 24 hours (daily backup + PITR where the provider offers it); RTO 4 hours. Realistic for a two-person team without on-call, and consistent with 99% monthly uptime. **Marked proposed because the SRS specifies neither.**

**Procedure:** provision clean database → restore latest → verify row counts including **`audit_log`** → point staging at it → run smoke tests → confirm. Rehearsed before launch, then quarterly.

**Incident ownership** — 🟦 the technical owner (OD-020) is the named responder. Communication is Shehersaaz's, not the architecture's.

**Object storage** relies on provider durability. 🟩 Media is **not** in the database backup; a media-loss scenario is degraded (missing images) rather than fatal, and is accepted at this scale.
