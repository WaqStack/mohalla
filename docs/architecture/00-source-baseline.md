# 00 — Source Baseline & Conflict Register

**Stage 4 · Technical Architecture · Shehersaaz Community Platform (Mohalla — محلہ)**
Version 1.1 · Corrected baseline
Status: **Baseline established — architecture may proceed**

> **Revision 1.1** applies eight corrections issued by the product owner after the Stage 4 first response.
> The most material is **ARCH-CONFLICT-009**, a prototype/UI-UX discrepancy missed in v1.0.
> Changes are listed in §7.

---

## 1. Source files reviewed

All four approved files were read in full. HTML chrome (CSS/JS) was stripped and the complete text content — headings, tables, requirement IDs, business rules, acceptance criteria, tokens and copy — was read directly. The prototype was additionally executed in a browser.

| # | File | Size | Status | Authority |
|---|---|---|---|---|
| 1 | `docs/product-scope-v1.html` | 106 KB | Approved (Stage 1) | 2 |
| 2 | `docs/srs-mvp-v1.html` | 255 KB | Approved (Stage 2) | **1 — highest** |
| 3 | `docs/uiux-spec-v1.html` | 321 KB | Approved (Stage 3) | 3 |
| 4 | `docs/prototype.html` | 117 KB · 1,542 lines | Approved (Stage 3) | 4 |

**Authority order** (per the Stage 4 brief): SRS → Product Scope → UI/UX specification → prototype → architect's recommendation. The SRS contains six approved Stage-2 changes (S2-CR-001…006) that supersede the earlier Product Scope where they overlap.

**No source file was modified during Stage 4.**

### 1.1 Extracted inventory

| Artefact | Count | Source |
|---|---|---|
| Functional requirements | **124** across 15 modules | SRS §10 |
| Business rules | **49** (BR-001…046, BR-VIS-001, BR-VID-001, BR-ADM-001) | SRS §11 |
| Validated fields | **34** across 5 form groups | SRS §12 |
| Security requirements | **28** (SEC-001…028) | SRS §13 |
| Privacy requirements | **19** (PRIV-001…019) | SRS §14 |
| Non-functional requirements | **34** (PERF · SCAL · AVAIL · USAB · ACC · COMP · MAIN · OBS) | SRS §15 |
| Error conditions | 13 | SRS §16 |
| Edge cases | **32** (EDGE-001…032) | SRS §17 |
| Release acceptance criteria | **8** (REL-001…008) | SRS §18 |
| Assumptions | 15 (A1…A15) | SRS §19 |
| Dependencies | **16** (DEP-001…016) | SRS §20 |
| Risks | **14** (RSK-001…014) | SRS §22 |
| Open decisions | 8 (OD-011, OD-014…020) | SRS §26 |
| Screen IDs | **70** (61 citizen + 9 admin) | UI/UX §10 |
| Design tokens | **91** (47 colour · 11 type · 10 spacing · 5 radius · 3 elevation · 5 motion) | UI/UX §14 |
| Components | **48** across 11 groups | UI/UX §18 |
| Prototype screens | **29** wired screens | prototype.html |
| Prototype flows | **12** wired flows — see ARCH-CONFLICT-009 | prototype.html |

### 1.2 Screen ID namespaces

`UX-AUTH-001…012` (12) · `UX-SETUP-001…003` (3) · `UX-HOME-001…007` (7) · `UX-SEARCH-001…003` (3) · `UX-CREATE-001…004` (4) · `UX-EVENT-001…005` (5) · `UX-MSG-001…004` (4) · `UX-PROFILE-001…006` (6) · `UX-SET-001…009` (9) · `UX-SAFE-001…004` (4) · `UX-STATE-001…004` (4) · `UX-ADM-001…009` (9) = **70**

---

## 2. Prototype execution record

The prototype was run in a browser and driven directly. **What was actually verified:**

| Check | Result |
|---|---|
| JavaScript live (not a static snapshot) | ✅ `typeof setLang === 'function'` |
| Language switch to Urdu | ✅ `frame[dir]` becomes `rtl` |
| **True RTL mirroring** | ✅ Top-bar actions move to the leading edge; the 3px category accent mirrors to the right; avatar right-aligns; nav labels become `گھر · تقریبات · لکھیں · پیغامات · پروفائل`. This is layout mirroring, not right-aligned text (BR-041 satisfied in the reference). |
| Offline + suspended banners | ✅ Both render, stack correctly, and localise |
| Suspended write-block | ✅ `navGo('composer')` refuses navigation and opens the suspension explainer instead |
| Suspension copy | ✅ *"You can still read everything. You can't post, comment, message or follow for now. The limit lifts automatically — you don't need to do anything."* |
| Neutral unavailable state | ✅ `s-unavail` serves deleted / under-review / blocked / banned identically |
| Under-review author view | ✅ `s-review` shows author-only content with the engagement row removed |

**Accurate statement of coverage:** the prototype wires **twelve flows**, and eleven of them correspond to the UI/UX definitions. **Its P-12 is "Delete account · T3", not the UI/UX "Admin moderation".** The prototype contains **no administrator screens** — all 29 screen IDs are citizen-side. Admin moderation was therefore **not** walkable in the prototype and has been validated from the UI/UX specification and the SRS instead. See ARCH-CONFLICT-009.

**The v1.0 first response claimed all twelve flows were walked. That claim was wrong and is withdrawn.**

---

## 3. Architecture Conflict Register

Nine conflicts. Each records files, IDs, impact, options, recommendation, and whether it blocks architecture.

---

### ARCH-CONFLICT-001 — Token model cannot satisfy the revocation requirement
**Severity:** 🔴 High · **Blocks:** Architecture — *resolved here*

| | |
|---|---|
| **Files / IDs** | SRS AUTH-FR-010 vs BR-035, EDGE-010, ADMIN-FR-006, ADMIN-FR-007, SET-FR-004 |
| **Conflict** | AUTH-FR-010 proposes a *"Proposed access token 24 h"*. BR-035 requires suspension, ban and deletion to invalidate **every** session immediately; EDGE-010 requires rejection **within one request cycle**. A stateless 24-hour JWT cannot be revoked. Separately, AUTH-FR-010's *max 5 concurrent devices, oldest evicted* requires a server-side device registry regardless. |
| **Product impact** | A banned or suspended user retains full write access for up to 24 hours. |
| **Security impact** | Directly defeats ADMIN-FR-006/007 enforcement and BR-035. |
| **Privacy impact** | A user who deleted their account could still be authenticated against it. |
| **Options** | (a) JWT + denylist — the denylist *is* server state, so statelessness is illusory and every request still reads it; (b) 5-minute JWT + rotating refresh — still a 5-minute revocation window, and doubles the token machinery; (c) **server-backed opaque session tokens**. |
| **Recommendation** | **(c).** One `sessions` table delivers immediate revocation, the five-device cap, oldest-session eviction and admin visibility through a single mechanism. At ≤500 concurrent users the per-request lookup is trivial and cacheable in-process. |
| **Recorded in** | ADR-008 |

---

### ARCH-CONFLICT-002 — A Must requirement depends on a Should requirement
**Severity:** 🔴 High · **✅ RESOLVED 1 September 2026 — OD-022 approved: MSG-FR-005 promoted to Must**

| | |
|---|---|
| **Files / IDs** | MSG-FR-005 *(Should)* vs NOTIF-FR-004 *(Must)*, BR-027, BR-028 |
| **Conflict** | NOTIF-FR-004 is **Must** and its acceptance criterion reads: *"GIVEN a message from a non-follower, WHEN it arrives, THEN no push notification is delivered."* That is unsatisfiable unless the Message Request mechanism (MSG-FR-005, **Should**) exists. BR-027 and BR-028 likewise presuppose it. |
| **Product impact** | If MSG-FR-005 is cut under OD-011 pressure, a Must requirement silently fails and the platform's principal defence against unsolicited contact disappears — the SRS names this as mattering most for women users. |
| **Security / privacy impact** | Removing it means any stranger can push-notify any user. |
| **Options** | (a) **Promote MSG-FR-005 to Must**; (b) re-scope NOTIF-FR-004 to remove the non-follower clause; (c) leave the contradiction unresolved. |
| **Recommendation** | **(a) Promote to Must.** It is roughly one developer-day inside the messaging boundary, not a separate feature. |
| **✅ DECISION** | **Approved 1 September 2026 — MSG-FR-005 is promoted from Should to Must for implementation planning.** It is now on the Must critical path and **protected from the MoSCoW cut order**. |
| **Behaviour preserved** | Non-follower first message → Message Request · **no push notification** · reading a request sends **no read receipt** · accept moves it to the normal inbox · **decline gives the sender no signal** · block applies normal blocking rules. |
| **Recorded in** | `STAGE-4-APPROVAL.md` · ADR-021 · `16` · `17` · `18`. **The historical SRS file is not altered.** |

---

### ARCH-CONFLICT-003 — Per-viewer counts vs the latency budget
**Severity:** 🟠 Medium · **Blocks:** No — resolved in the data model

| | |
|---|---|
| **Files / IDs** | PROFILE-FR-009, ENGAGE-FR-006 vs NFR-PERF-002 |
| **Conflict** | Counts must exclude blocked users **in both directions**, making every count viewer-dependent. A single denormalised counter column is therefore incorrect, but computing counts per viewer per request threatens the 800 ms p95 target. |
| **Recommendation** | **Denormalised counter as the fast path, plus a bounded per-viewer correction.** A user's block list is small and indexed; subtract only the blocked contribution. The SRS already states that two users may legitimately see different totals (ENGAGE-FR-006), so this is faithful, not a compromise. |
| **Recorded in** | `07-database-design.md` · `11-media-feed-search.md` |

---

### ARCH-CONFLICT-004 — Erasure vs the counterpart's retained conversation
**Severity:** 🟠 Medium · **Blocks:** No — proceeds on a stated default · **Legal review required**

| | |
|---|---|
| **Files / IDs** | PRIV-007 vs BR-046 *(already flagged Legal review in the SRS)* |
| **Conflict** | PRIV-007 requires personal data to be *permanently erased* 30 days after deletion. BR-046 says the other participant **retains their copy** of the conversation — which contains messages authored by the deleted user. |
| **Recommendation** | Retain message **body text** as the counterpart's own record; erase the **identity link** so the sender resolves to the anonymised actor. The counterpart's conversation history is equally their data. |
| **Status** | Default applied. **Requires legal confirmation under OD-019** before launch. |

---

### ARCH-CONFLICT-005 — Permanent ban list vs data minimisation
**Severity:** 🟠 Medium · **Blocks:** No

| | |
|---|---|
| **Files / IDs** | BR-036, ADMIN-FR-007 vs PRIV-001, PRIV-007 |
| **Conflict** | BR-036 requires a banned mobile number to be permanently unusable for re-registration, which implies retaining that number indefinitely — against the data-minimisation posture of PRIV-001 and the erasure requirement of PRIV-007. |
| **Recommendation** | Store a **peppered one-way hash** of the identifier in a `banned_identifiers` table. This enforces BR-036 without retaining the plaintext number, and survives PRIV-007 erasure of the account record. |
| **Note** | The pepper is a secret under SEC-025 and must be rotated only with a documented migration, since rotation invalidates the ban list. |

---

### ARCH-CONFLICT-006 — Attendee avatars contradict the SRS
**Severity:** 🟠 Medium · **Blocks:** No — but the design must be corrected before UX-EVENT-003 is built

| | |
|---|---|
| **Files / IDs** | **SRS EVENT-FR-004** vs UI/UX `UX-EVENT-003` and prototype `#event` |
| **Conflict** | EVENT-FR-004 states: *"RSVP is public to the extent that the count is public, but **the attendee list is not shown in V1**."* The UI/UX event detail and the prototype both render a stacked attendee avatar row (`A · B · C · +15`), which identifies attendees. |
| **Product impact** | Attendance at a women's-rights, governance or disaster event is sensitive. Publishing who is attending is a materially different privacy posture from publishing how many. |
| **Resolution** | **SRS wins** under the authority order. |
| **Architecture consequence** | The API exposes an **aggregate count only**. **No `GET /events/{id}/attendees` endpoint exists in Version 1.** No response body carries attendee identities to an ordinary user. Any creator or administrator visibility is limited to what the SRS explicitly supports — which is nothing beyond the count, so none is built. |
| **Design action** | Avatar stack flagged for UI correction before implementation of UX-EVENT-003. Recorded for Stage 3 handoff. |

---

### ARCH-CONFLICT-007 — Email registration interacts badly with two Must rules
**Severity:** 🔴 High · **✅ RESOLVED 1 September 2026 — OD-021 decided as Option C**

| | |
|---|---|
| **Files / IDs** | AUTH-FR-004 *(Should)* vs BR-036, BR-001, SRS §3 *(registration restricted to Pakistani mobile numbers)*; mitigation context in RSK-007 |
| **Conflict** | AUTH-FR-004 states a user has *either* a phone *or* an email as primary identifier, not both in V1. An email-primary account therefore has **no phone number**, so: (i) the ban list under BR-036 has nothing to bind to, and (ii) the Pakistan-only registration restriction is not enforced on that path. It also introduces a second identity path through authentication, deletion, moderation and enforcement. |
| **Counter-consideration** | **The SRS explicitly names email registration as a partial fallback for SMS-delivery risk (RSK-007).** Cutting it removes a stated mitigation for a live, high-probability risk. AUTH-FR-004 is an approved Should requirement. |
| **Options** | **A.** Cut AUTH-FR-004 from V1. **B.** Retain it and generalise BR-036 from *banned mobile number* to *banned verified primary identifier*, so the ban list binds to whichever identifier the account actually uses. **C.** Retain email only as **secondary** recovery/contact information, never as a registration identity — phone remains the sole primary identifier. |
| **Recommendation** | **Lean B, but B is not sufficient on its own and must not be treated as decided.** Generalising BR-036 to the verified primary identifier stops *that identifier* being reused — it does **not** stop the same person returning with a different phone number, and blocking an email does not bind a phone at all. Ban durability is therefore a function of *what identity every account is required to hold*, not of how the ban list is keyed. |
| **The actual product question** | **"What identity must every V1 account possess so that a permanent ban can be enforced consistently?"** Until that is answered, no ban-keying scheme is complete. Recorded verbatim in OD-021. |
| **Architecture position** | **AUTH-FR-004 is NOT treated as removed, and BR-036 is NOT rewritten.** The identity model carries an `identity_type ∈ {PHONE_PRIMARY, EMAIL_PRIMARY}` discriminator and a polymorphic verified-identifier table from day one. **Phone remains the required V1 identity path until OD-021 is decided.** Ban enforcement is expressed as a **configurable domain policy** (`BanEnforcementPolicy`) rather than a hard-coded rule, so A, B and C are all reachable by changing a policy implementation — not a schema. |
| **✅ DECISION** | **Option C, approved 1 September 2026.** Every normal V1 account must hold a **verified Pakistani mobile number**. Phone + SMS OTP is the required registration and identity mechanism. Email may exist as **optional secondary recovery/contact information only**; email-primary registration is **removed from V1**. **AUTH-FR-004 is removed from V1 as an approved product change.** BR-036 is unchanged. |
| **Consequences** | `EMAIL_PRIMARY` normal-user accounts are **not implemented**. `users.identity_type` is removed as redundant. `user_identifiers` stays polymorphic with a single-line `CHECK` restricting the primary to `PHONE`, so a future identity method needs one constraint relaxed, not a migration. Neutral anti-enumeration responses are preserved unchanged. |
| **Recorded in** | `STAGE-4-APPROVAL.md` · ADR-021 · `17` · `18` · `16`. **The historical SRS file is not altered.** |

---

### ARCH-CONFLICT-008 — "No public web" vs share links and policy URLs
**Severity:** 🟡 Low · **Blocks:** No

| | |
|---|---|
| **Files / IDs** | NFR-COMP-004 vs ENGAGE-FR-007, PRIV-017, SET-FR-008, DEP-007 |
| **Conflict** | NFR-COMP-004 states there is no public web application in V1. But ENGAGE-FR-007 requires a shareable link that prompts login-or-install, and PRIV-017 requires a publicly reachable Privacy Policy URL as a Google Play submission condition. Both need a public web surface. |
| **Recommendation** | Read NFR-COMP-004 as *"no public web **product**"*. A static Android App-Links interstitial plus the three policy documents, served from the admin deployment, satisfies both without becoming a web application. No feed, no content, no authentication surface. |
| **Recorded** | So that this is not later mistaken for scope creep. |

---

### ARCH-CONFLICT-009 — Prototype P-12 does not match UI/UX P-12
**Severity:** 🟠 Medium · **Blocks:** No — **design/prototype correction required before final UX handoff**
**⚠ Missed in first response v1.0; added in v1.1.**

| | |
|---|---|
| **Files / IDs** | UI/UX §26 prototype flow **P-12 = Admin moderation** vs `prototype.html` **P-12 = Delete account · T3** |
| **Conflict** | The UI/UX specification defines P-12 as the administrator moderation flow: *admin login → dashboard → queue → item detail → restore/delete → mandatory reason → audit entry*. The prototype's `FLOWS` map resolves `p12` to the `del` screen, and its flow list is labelled **"P-12 Delete account · T3"**. |
| **Verified extent** | Broader than a label mismatch: the prototype contains **no administrator screens at all**. Its 29 screen IDs are entirely citizen-side (`splash · lang · welcome · login · reg1–4 · otp · uname · psetup · suggest · home · post · composer · events · event · msgs · convo · me · other · notifs · search · settings · del · s-empty · s-loading · s-unavail · s-review`). None of `UX-ADM-001…009` is represented. |
| **Resolution** | **The UI/UX specification is authoritative over prototype behaviour where they conflict.** |
| **Consequences** | 1. **Admin moderation remains a required V1 architecture and implementation flow** — `UX-ADM-001…009`, ADMIN-FR-001…012, SAFETY-FR-004, BR-038, BR-039. 2. **Account deletion remains separately required** through SET-FR-004, SET-FR-005 and BR-009 — it is not displaced by this correction. 3. **Admin moderation is validated from the UI/UX specification and the SRS, never from the prototype.** 4. Any statement that all twelve UI/UX flows were walked in the prototype is inaccurate and is withdrawn. |
| **Design action** | Prototype and UI/UX flow numbering must be reconciled before final UX handoff. Recommended: prototype P-12 is relabelled to the citizen deletion flow it actually implements, and the admin moderation flow is either added or explicitly marked as specification-only. **This is a Stage 3 correction, not a Stage 4 blocker.** |
| **Testing consequence** | The test architecture (`15-…`) must source admin-moderation test cases from ADMIN-FR-* acceptance criteria and EDGE-024/025/026 — **not** from prototype behaviour, which does not exist for this area. |

---

### 3.1 Conflict summary

| ID | Severity | Blocks architecture | Needs PO / legal | Resolved in |
|---|---|---|---|---|
| ARCH-CONFLICT-001 | 🔴 | Resolved | No | ADR-008 |
| ARCH-CONFLICT-002 | 🔴 | No | **PO — priority** | OD-022 |
| ARCH-CONFLICT-003 | 🟠 | No | No | `07`, `11` |
| ARCH-CONFLICT-004 | 🟠 | No | **Legal** | OD-019 |
| ARCH-CONFLICT-005 | 🟠 | No | No | `07`, `10` |
| ARCH-CONFLICT-006 | 🟠 | No | Design correction | `08`, Stage 3 |
| ARCH-CONFLICT-007 | 🔴 | No | **PO — scope** | OD-021 |
| ARCH-CONFLICT-008 | 🟡 | No | No | `14` |
| ARCH-CONFLICT-009 | 🟠 | No | Design correction | Stage 3 |

**No conflict blocks technical architecture.** Two require product-owner ratification and two require Stage 3 design correction; all four are recorded with owners in `17-open-decisions.md`.

---

## 4. Gaps — no conflict, default recorded

| Gap | Source silence | Default applied | Reversible |
|---|---|---|---|
| Timezone handling | Only *"displayed in Pakistan Standard Time"* (SRS §12) | Store UTC; render `Asia/Karachi`; events store an explicit zone | Yes |
| Category list content | DEP-012 / OD-017 unresolved | Seed the 11 categories defined in UI/UX §15 | Yes |
| Urdu string content | DEP-011 unresolved | English keys ship; Urdu is a content dependency, not a code dependency | Yes |
| Data residency | OD-019 unresolved | Region selected for measured latency; residency re-openable without redesign | Yes |
| Password hash parameters | SEC-001 names no algorithm | Argon2id, parameters benchmarked on the chosen host | Yes |
| Prototype coverage | 29 of 70 screens | Expected — behavioural reference, not a coverage claim | n/a |

---

## 5. Technical Architecture Driver Matrix

| Driver | Source IDs | Requirement | Architecture impact | Priority |
|---|---|---|---|---|
| **D-01** | LOCALE-FR-002/003 · BR-041 · NFR-USAB-004 · REL-002 | Immediate runtime language switch with complete interface mirroring | Strongly favours a platform with mature, restart-free runtime RTL. Logical start/end properties throughout; lint rule banning physical `left`/`right`. See ADR-001. | 🔴 |
| **D-02** | NFR-COMP-001/002 · NFR-PERF-003 | API 26+ · 2 GB RAM · 720×1280 · 4 s cold start | Favours a native, low-overhead mobile runtime. Caps APK size and dependency weight. | 🔴 |
| **D-03** | NFR-PERF-001/004/005 · MEDIA-FR-001 | 3 s feed on 3G · progressive images · ≤500 KB transmitted | On-device compression before upload; bounded payloads; media delivery strategy evaluated in ADR-012. | 🔴 |
| **D-04** | AUTH-FR-001/002/003 · BR-001 · DEP-002 · RSK-007 | Pakistani phone + OTP as primary identity | SMS provider behind a port; sandbox mode per environment; resend caps; provider **unverified** and must be validated on all major Pakistani networks. | 🔴 |
| **D-05** | PRIV-003 · SEC-006 · PRIV-008 | Phone/email/DOB never user-visible; no account enumeration | Phone never enters a public DTO; separate internal and public projections; uniform response **and timing** on auth paths. | 🔴 |
| **D-06** | BR-035 · EDGE-010 · AUTH-FR-010 · ADMIN-FR-006/007 | Immediate session revocation · max 5 devices | Server-backed opaque sessions in PostgreSQL. Rules out stateless-only JWT. ADR-008. | 🔴 |
| **D-07** | MSG-FR-002/004 · EDGE-020/021 · NFR-PERF-007 | 3 s delivery · idempotent · renders exactly once | Client-generated message UUID as idempotency key with a unique constraint; server timestamp ordering; REST/realtime split; push fallback. ADR-009. | 🔴 |
| **D-08** | SEC-012/013/015 · MEDIA-FR-003/005 · EDGE-014 | Content-inspected uploads · random object names · no executables | Presigned upload into a quarantine prefix → worker validates by content → promote. Never trust extension or client MIME. ADR-013. | 🔴 |
| **D-09** | BR-026 · FEED-FR-001/003/004 · EDGE-017 | Strict reverse-chronological · stable pagination | Fan-out on read; keyset cursor on `(created_at, id)`; no timeline materialisation; no ranking. ADR-020. | 🔴 |
| **D-10** | SEARCH-FR-001/002/003 · BR-042 · RSK-012 | Urdu script + English + best-effort Roman Urdu | PostgreSQL FTS + `pg_trgm` + a normalised transliteration column. No dedicated search engine at this scale. ADR-011. | 🟠 |
| **D-11** | SAFETY-FR-004 · BR-030/032 · EDGE-023/024/026 | Distinct-reporter thresholds · atomic · never auto-delete | Unique `(reporter, target)` constraint; threshold evaluated inside the reporting transaction; optimistic-concurrency guard on moderation decisions. | 🔴 |
| **D-12** | BR-039 · SEC-022/023 · ADMIN-FR-012 | Append-only audit with no deletion path | Dedicated table with `REVOKE UPDATE, DELETE` at the database-role level — enforced by the database, not by application discipline. Sensitive *views* are auditable events. ADR-018. | 🔴 |
| **D-13** | SET-FR-004/005 · BR-008/009/046 · PRIV-006/007 | Deactivate → 30-day grace → erase + anonymise | Explicit lifecycle state machine, scheduled erasure job, per-entity anonymisation strategy. Not a boolean flag. ADR-019. | 🔴 |
| **D-14** | SEC-020/021 · BR-ADM-001 · S2-CR-005 · AUTH-FR-011 | Separate admin credentials · no admin-on-admin action | Two identity tables, two authentication pipelines; admin-target mutations rejected server-side; provisioning by CLI only, never an endpoint; no bootstrap route. | 🔴 |
| **D-15** | Stage-4 constraints · NFR-MAIN-001/003 · NFR-AVAIL-001 | 2 developers · no DBA/SRE/K8s · ~90 dev-days · 99% uptime | Modular monolith · managed PostgreSQL · managed PaaS · database-backed queue. No Kubernetes, Kafka, Elasticsearch, or Redis in V1. ADR-005, ADR-016. | 🔴 |
| **D-16** | ARCH-CONFLICT-007 · AUTH-FR-004 | Identity model must support phone-primary **and** email-primary | `identity_type` discriminator + polymorphic verified-identifier table from day one, so AUTH-FR-004 stays implementable or cuttable without redesign. | 🟠 |
| **D-17** | ARCH-CONFLICT-006 · EVENT-FR-004 | RSVP count public; attendee identities not exposed | Aggregate count only in every response; no attendee-listing endpoint in V1. | 🟠 |
| **D-18** | ARCH-CONFLICT-009 · ADMIN-FR-001…012 | Admin moderation has no prototype reference | Admin architecture and its tests derive from UI/UX §27 and SRS §10.14 only. | 🟠 |

---

## 6. Highest-risk technical areas

| Rank | Area | Source risk | Why it ranks here | Primary mitigation |
|---|---|---|---|---|
| 1 | RTL across 70 screens | RSK-004 | Retrofit cost is severe and REL-002 gates release | First screen validated in both directions before the second is built; logical properties only; automated RTL screenshot pass |
| 2 | Realtime messaging correctness | RSK-008 · EDGE-019…022 | Duplicate and ordering defects are silent and corrosive | Client UUID + unique constraint; persist-then-acknowledge; polling fallback reuses the same idempotency key |
| 3 | Moderation atomicity | EDGE-023/024/026 | Threshold races and admin collisions produce wrong enforcement | Threshold inside the reporting transaction; version column on moderation cases |
| 4 | Media pipeline cost and safety | RSK-013 · SEC-013 | Storage is the largest recurring cost; uploads are the classic attack surface | 500 KB cap; quarantine-then-promote; orphan sweeper; storage alerting (NFR-SCAL-003) |
| 5 | SMS/OTP in Pakistan | RSK-007 · DEP-002 | Provider unverified; per-message cost is real; coverage varies by network | Provider port + sandbox; resend caps; **coverage must be tested on all major networks before launch** |
| 6 | Account deletion correctness | RSK-009 · PRIV-006/007 | Irreversible and legally exposed | Explicit state machine; dry-run in staging; restore tested at day 29 and day 31 |
| 7 | Admin privilege boundary | SEC-021 · BR-ADM-001 | A single compromised admin must not be able to lock out the team | Separate identity store; CLI-only provisioning; server-side rejection of admin targets |
| 8 | Cold start | RSK-001 | The product's single largest risk | Seed tooling is an architecture deliverable, not a launch afterthought (DEP-014 / OD-018) |

---

## 7. Revision history

| Version | Change |
|---|---|
| 1.0 | Initial baseline — 8 conflicts |
| **1.1** | **C1** ARCH-CONFLICT-009 added; prototype coverage claim corrected and withdrawn. **C2** ARCH-CONFLICT-007 revised — AUTH-FR-004 **not** treated as removed; three options recorded; moved to OD-021; identity model made dual-capable (D-16). **C3** ARCH-CONFLICT-002 retained; architecture dependency separated from priority change; moved to OD-022. **C4** ARCH-CONFLICT-006 retained and strengthened — no attendee endpoint in V1 (D-17). **C5** RTL reasoning softened; React Native verified against official documentation rather than asserted; ADR-001 reframed as comparative selection. **C6** Unsourced market statistic removed. **C7** CDN reclassified from requirement to architecture decision (ADR-012). **C8** All prior sound recommendations preserved unchanged. |

---

## 8. Baseline status

**✅ BASELINE ESTABLISHED — architecture may proceed.**

- All four source files read completely; none modified
- Prototype executed; coverage stated accurately, including what it does **not** cover
- Nine conflicts recorded; none blocks architecture
- Two product-owner decisions and two Stage 3 design corrections recorded with owners
- Eighteen architecture drivers derived from requirement IDs, not from technology preference
