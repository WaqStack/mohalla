# STAGE 4 — TECHNICAL ARCHITECTURE APPROVAL

**Shehersaaz Community Platform · Mohalla — محلہ**

---

## Approval status

| | |
|---|---|
| **Status** | ✅ **APPROVED AND FROZEN** |
| **Approval date** | **1 September 2026** |
| **Architecture version** | **1.2 — frozen baseline** |
| **Approved by** | Shehersaaz product owner |
| **Baseline for** | Stage 5 — Project Foundation / Development Environment Setup |

---

## Scope of approval

**This approval covers:** the technology stack · the architecture style and module boundaries · the data model · the API contract · authentication and authorization · security and privacy controls · media, feed and search · messaging and notifications · moderation and audit · infrastructure, environments and CI/CD · testing, observability and recovery · the implementation epic order and critical path.

**This approval does NOT authorise feature implementation.** Authentication, Posts, Feed, Messaging, Events and every other product feature remain unstarted. The next stage is **Stage 5 — Project Foundation**, which requires separate approval.

---

## Approved stack

| Layer | Selected |
|---|---|
| Mobile | **Kotlin + Jetpack Compose** · Android API 26+ |
| Admin | **Next.js** — also serves the App-Links interstitial and policy pages |
| Backend | **NestJS** · TypeScript |
| Architecture style | **Modular monolith** — 15 modules, three-tier dependency rule |
| Primary database | **PostgreSQL** — major version fixed at EPIC-00 |
| Realtime | **Socket.IO**, single instance initially |
| Background jobs | **pg-boss** on PostgreSQL |
| Search | **PostgreSQL FTS + pg_trgm** with a normalised transliteration column |
| Media | **S3-compatible storage with a private quarantine pipeline**, CDN delivery |
| Push | **Firebase Cloud Messaging** |
| SMS | **Provider abstraction** — provider selected after Pakistani network coverage testing |
| Hosting | **Managed PaaS** — provider and region deferred pending latency measurement and OD-019 |

### Deliberately not introduced in V1

Kubernetes · Kafka · Elasticsearch · microservices · GraphQL · video infrastructure · **Redis unless a documented scaling trigger is reached** (ADR-009 §Scaling, ADR-010).

---

## Approved product decisions

### ✅ OD-021 — V1 identity · **Option C**

**Every normal V1 user account must possess a verified Pakistani mobile number.** Phone + SMS OTP is the required registration and identity mechanism.

- **AUTH-FR-004 is removed from V1** as an approved product change
- `EMAIL_PRIMARY` normal-user accounts are **not implemented**
- Email may be supported as **optional secondary recovery/contact information**
- **BR-036 is unchanged** — a banned account's registered mobile number cannot create a new account
- **Neutral anti-enumeration responses are preserved**
- The identity design remains extensible: `user_identifiers` stays polymorphic, and `CHECK (NOT is_primary OR kind = 'PHONE')` is the single line a future version relaxes

**Recorded in:** ADR-021 · `00` ARCH-CONFLICT-007 · `07` · `08` · `09` · `16` · `18` · `contracts/openapi-v1.yaml`
**Consequence:** ~4 days removed from EPIC-02. **RSK-007's email fallback is given up** — SMS is now the sole onboarding dependency, raising DEP-002's importance.

### ✅ OD-022 — Message Requests · **promoted to MUST**

**MSG-FR-005 is promoted from Should to Must for implementation planning**, closing the contradiction with NOTIF-FR-004 (already Must).

Behaviour preserved: non-follower first message → Message Request · **no push notification** · reading sends **no read receipt** · accept moves it to the normal inbox · **decline gives the sender no signal** · block applies normal blocking rules.

**Now on the Must critical path and removed from the MoSCoW cut order.**

**Recorded in:** `00` ARCH-CONFLICT-002 · `12` · `16` · `18`

### ✅ OD-011 — Delivery timeline

| | Working days |
|---|---|
| **Committed planning baseline** | **68** |
| Internal stretch target | **~65** |

**The schedule may not be met by:** removing private messaging · removing essential safety controls · skipping RTL · reducing QA · bypassing security work · skipping staging · skipping physical-device testing.

**Must requirements are protected first.** If pressure occurs, the approved MoSCoW cut order in `16` §5 applies.

**Recorded in:** `16` §1, §4, §5

### ✅ OD-023 — PDF attachment · **CONDITIONAL SHOULD** *(revised — earlier proposal not approved)*

The earlier proposal — *"magic-byte only, no malware scanning"* — was **NOT approved and is withdrawn**. 🟦 SEC-013 requires executable content to be rejected from every upload path, and **a Should feature may not weaken a Must security requirement**.

**Required before PDF ships:** verify actual PDF structure, not the extension · reject malformed files · reject detectable embedded executable/active content · quarantine never exposed · randomised final keys · 10 MB enforced server-side · device viewer only.

**Production gate:** the **Technical Lead must approve the selected inspection/sanitisation capability** before PDF is enabled in production.

**If no practical safe mechanism fits V1: CUT PDF FROM V1.** POST-FR-005, MEDIA-FR-003 and MEDIA-FR-004 are Should, so this does not block the MVP.

**Recorded in:** ADR-022 · ADR-013 · `11` · `16` · `18`

---

## Remaining release dependencies — owner: Shehersaaz

**None blocks Stage 5.** All block launch.

| ID | Dependency | Blocks |
|---|---|---|
| **OD-015** | Terms · Privacy Policy · Community Guidelines, both languages, publicly reachable | **Release** — Google Play rejects without a live Privacy Policy URL |
| **OD-016** | ~400 Urdu interface strings | **Release** — REL-002 |
| **OD-017** | Category list, both languages | Development of POST-FR-006 and FEED-FR-006 |
| **OD-018** | Seed content and accounts | **Launch** — RSK-001, the product's largest risk |
| **OD-019** | Regulatory position — residency, retention, PECA/PTA | Region selection; also governs ARCH-CONFLICT-004 and audit retention |
| **OD-020** | **Named technical owner** | **Release** — without one there is no route to the first administrator account, and the platform cannot be moderated |
| OD-014 | Final product name | Play submission |

### Stage 3 design corrections outstanding

| ID | Correction |
|---|---|
| **ARCH-CONFLICT-006** | Attendee avatar stack contradicts EVENT-FR-004. SRS wins — no attendee endpoint exists. UI to be corrected before UX-EVENT-003 is built |
| **ARCH-CONFLICT-009** | Prototype P-12 is "Delete account", not "Admin moderation"; the prototype contains no admin screens. Reconcile numbering before final UX handoff |

---

## Values to fix at EPIC-00

Framework and runtime versions · PostgreSQL major version and UUIDv7 generation strategy · **Argon2id parameters benchmarked on the chosen host** · SMS provider after Pakistani network coverage testing · hosting provider and region after latency measurement · Urdu typeface licence · **PDF inspection capability (OD-023 gate)**.

---

## Baseline integrity

- ✅ The original **Product Scope, SRS, UI/UX specification and prototype files are unmodified.**
- ✅ Approved product changes are recorded **here and in the Stage 4 change logs**, never by rewriting the historical SRS.
- ✅ Superseded architecture positions are preserved in their ADRs with the superseding decision named — ADR-021 supersedes the OD-021 open position; ADR-022 supersedes the withdrawn PDF proposal in ADR-013.

---

## Frozen artefacts

| Group | Count |
|---|---|
| Architecture documents | 19 |
| ADRs | **22** |
| Diagrams | 13 |
| Contracts | 3 |
| HTML summary | 1 |
| **Approval record** | **this file** |
| **Total** | **59** |

---

**Stage 4 is APPROVED and FROZEN as of 1 September 2026.**

**Next stage:** Stage 5 — Project Foundation / Development Environment Setup. **Requires separate approval before execution.**
