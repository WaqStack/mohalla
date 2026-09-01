# 18 — Requirements ↔ Architecture Traceability

**Stage 4 · Shehersaaz Community Platform** · Version 1.1 · Status: **Complete**

> **Guardrail 2 applies throughout.** A requirement has **one primary module owner** but is implemented by **many architecture components**. The mapping below is deliberately one-to-many: a single requirement routinely touches a module, an API, a database constraint, a screen, a security control and several tests.
>
> **Status:** ✅ Covered · ⚠️ Partial (dependency named) · ⛔ Not applicable (reason given)

---

## 1. Coverage summary

> **Updated 1 September 2026** to reflect the four approved Stage-4 decisions.

| Requirement family | Count | ✅ | ⚠️ | ⛔ N/A |
|---|---|---|---|---|
| Functional (FR) | 124 | 119 | 4 | **1** |
| Business rules (BR) | 49 | 49 | 0 | 0 |
| Security (SEC) | 28 | 28 | 0 | 0 |
| Privacy (PRIV) | 19 | 13 | 6 | 0 |
| Non-functional (NFR) | 34 | 32 | 2 | 0 |
| Edge cases (EDGE) | 32 | 32 | 0 | 0 |
| Release (REL) | 8 | 3 | 5 | 0 |
| **Total** | **294** | **276** | **17** | **1** |

**100% addressed · 276 fully covered · 17 partial · 1 removed by approved decision · 0 missing.**

**Changes from the four approved decisions:**

| Requirement | Change | Decision |
|---|---|---|
| **AUTH-FR-004** | ⛔ **Removed from V1** — email-primary registration | ✅ OD-021 Option C |
| **MSG-FR-005** | Should → **MUST**; on the critical path, not cuttable | ✅ OD-022 |
| **POST-FR-005 · MEDIA-FR-003 · MEDIA-FR-004** | Covered → ⚠️ **conditional** on the PDF safety gate | ✅ OD-023 revised |

**The 17 partials, in full:**

| ID | Why partial | Blocked by |
|---|---|---|
| **POST-FR-005 · MEDIA-FR-003 · MEDIA-FR-004** | PDF ships only if safe inspection is implemented and Technical-Lead approved; **otherwise cut** | ✅ OD-023 |
| AUTH-FR-012 | Google sign-in (Could) deferred | DEP-009 |
| PRIV-006, PRIV-007, PRIV-016 | Anonymisation and licence wording | 🟦 Legal — OD-019 |
| PRIV-017, PRIV-018 | Policy documents must exist | 🟦 OD-015 |
| PRIV-019 | Regulatory position | 🟦 OD-019 |
| NFR-COMP-002, NFR-OBS-002 | Need physical devices | DEP-010 |
| REL-001, REL-002, REL-005, REL-006, REL-008 | Validated only at EPIC-16 | DEP-006/010/011/014 |

⛔ **Nothing is uncovered.** The single ⛔ is AUTH-FR-004, **removed by approved product decision OD-021 Option C** — not a gap.

---

## 2. Functional requirements → components

Columns: **Primary owner** · **Also implemented by** · **API** · **DB** · **Screens** · **Tests**

### Authentication
| Req | Primary | Also implemented by | API | DB | Screens | Tests |
|---|---|---|---|---|---|---|
| AUTH-FR-001 | identity | SMS port · validation · rate limit · mobile auth flow | AUTH-API-001 | `users` `user_identifiers` `banned_identifiers` UNIQUE | UX-AUTH-005/006/007 | EDGE-001, unit, API |
| AUTH-FR-002 | identity | SMS port · session · mobile | AUTH-API-002 | `otp_challenges` | UX-AUTH-009 | EDGE-005/006 |
| AUTH-FR-003 | identity | rate limit · SMS port | AUTH-API-003 | `otp_challenges` | UX-AUTH-009 | Rate-limit |
| AUTH-FR-004 | ⛔ **REMOVED — OD-021 Option C** | — | — | — | — | — |
| AUTH-FR-005 | identity | session · capability guard · mobile | AUTH-API-004 | `sessions` | UX-AUTH-004 | **B**, SEC-006 |
| AUTH-FR-006 | identity | mobile cache clear | AUTH-API-005 | `sessions` | UX-SET-001 | API |
| AUTH-FR-007 | identity | SMS port · session revocation | AUTH-API-006/007 | `sessions` `otp_challenges` | UX-AUTH-010/011 | **B** |
| AUTH-FR-008 | identity | validation | AUTH-API-001 | `users` CHECK | UX-AUTH-006 | Unit, DB |
| AUTH-FR-009 | identity | localization · legal pages | AUTH-API-001 | `users.terms_*` | UX-AUTH-008 | API |
| AUTH-FR-010 | identity | session · every guard | AUTH-API-008 | `sessions` partial index | all | **B**, EDGE-009/010 |
| AUTH-FR-011 | identity | admin guard · audit | AUTH-API-010/011 | `admins` `admin_sessions` | UX-ADM-001 | SEC-020 |
| AUTH-FR-012 | identity | ⚠️ Google port | — | `user_identifiers` | — | Deferred |

### Localization · Profile · Social
| Req | Primary | Also implemented by | API | DB | Screens | Tests |
|---|---|---|---|---|---|---|
| LOCALE-FR-001…006 | localization | mobile theme · notifications · every response | Header + `SET-API-001` | `users.language` | UX-AUTH-002 · UX-SET-002 · all | **G**, RTL screenshot |
| PROFILE-FR-001…011 | profile | identity · media · search · safety | PROF-API-001…010 | `profiles` `categories` | UX-SETUP-001/002 · UX-PROFILE-001…005 | EDGE-007/008 |
| SOCIAL-FR-001…005 | social-graph | safety · notifications · feed | SOC-API-001…005 | `follows` PK | UX-SETUP-003 · UX-PROFILE-004/005 | EDGE-015/016 |

### Posts · Media · Feed · Engagement
| Req | Primary | Also implemented by | API | DB | Screens | Tests |
|---|---|---|---|---|---|---|
| POST-FR-001…010 | posts | media · safety · feed · search · notifications | POST-API-001…004 | `posts` `post_media` `link_previews` | UX-CREATE-001…004 · UX-HOME-003 | EDGE-011/012/013 |
| MEDIA-FR-001…005 | media | posts · messaging · worker · storage · CDN | MED-API-001…003 | `media` states | UX-CREATE-002 · UX-HOME-004 | EDGE-014, SEC-013 |
| FEED-FR-001…007 | feed | posts · social-graph · safety · events | FEED-API-001…006 | partial indexes | UX-HOME-001/002/005/006 | EDGE-017/018 |
| ENGAGE-FR-001…008 | engagement | posts · safety · notifications | ENG-API-001…008 | `likes` PK · `comments` CHECK | UX-HOME-003 | EDGE-015 |

### Messaging · Events · Search · Notifications
| Req | Primary | Also implemented by | API | DB | Screens | Tests |
|---|---|---|---|---|---|---|
| MSG-FR-001…009 *(**005 now MUST** — OD-022)* | messaging | realtime gateway · safety · media · notifications · worker | MSG-API-001…009 + 5 realtime | `conversations` `conversation_participants` `messages` UNIQUE | UX-MSG-001…004 | **E**, EDGE-019…022 |
| EVENT-FR-001…008 | events | safety · notifications · worker · search | EVT-API-001…009 | `events` `event_rsvps` | UX-EVENT-001…005 | EDGE-031/032 |
| SEARCH-FR-001…005 | search | posts · profile · events · safety | SRCH-API-001…003 | GIN + trigram | UX-SEARCH-001…003 | Cross-script |
| NOTIF-FR-001…007 | notifications | outbox · worker · FCM · localization | NOTF-API-001…007 | `notifications` `outbox` `device_tokens` | UX-HOME-007 · UX-SET-003 | BR-027 |

### Safety · Admin · Settings
| Req | Primary | Also implemented by | API | DB | Screens | Tests |
|---|---|---|---|---|---|---|
| SAFETY-FR-001…009 | safety | **every read path** · moderation · notifications | SAFE-API-001…005 | `blocks` `reports` UNIQUE · `moderation_cases` | UX-SAFE-001…004 | **A**, **C**, EDGE-023 |
| ADMIN-FR-001…012 | moderation + admin-ops | identity · audit · notifications · posts · engagement · events | ADM-API-001…017 | `enforcement_actions` `announcements` `audit_log` | UX-ADM-001…009 | **D**, EDGE-024/027 |
| SET-FR-001…010 | settings | identity · profile · **every module's anonymisation contract** · worker | SET-API-001…005 | `deletion_requests` | UX-SET-001…009 · UX-AUTH-012 | **F**, EDGE-029/030 |

---

## 3. Business rules → enforcement point

| BR | Enforced at | Also relied on by |
|---|---|---|
| BR-001 | `UNIQUE (value_hash)` | Registration, ban check |
| BR-002 | `CHECK` on `date_of_birth` | AUTH-FR-008, PRIV-002 |
| BR-005 | `UNIQUE citext` + no update path | Mentions, search, moderation traceability |
| BR-009 | `AnonymisationContract` per module | ADR-019, PRIV-007 |
| BR-013 | `CHECK position 0–3` + `UNIQUE (post_id, position)` | Composer, media |
| BR-019 | `CHECK` on follows, blocks | Social, safety |
| BR-024 | Ordered pair + `UNIQUE` | Messaging |
| **BR-025** | **`VisibilityPolicy`, composed by every read path** | **Feed, search, profile, posts, comments, messaging, notifications, events** |
| BR-026 | Keyset ordering only | Feed |
| BR-027 | `isRequest` on the domain event | Messaging, notifications |
| BR-030 | `UNIQUE (reporter, target)` | Safety, moderation |
| BR-031 | Composite PK on `likes` | Engagement, counts |
| BR-032 | Transactional threshold + `FOR UPDATE` | Safety, moderation, feed, search |
| BR-034 | Capability guard | Every write endpoint |
| BR-035 | Session revocation in the state transaction | Identity, admin-ops, settings |
| BR-036 | `banned_identifiers` + swappable policy | Registration · 🟥 OD-021 |
| BR-038 | `CHECK` on `moderation_cases.resolution_reason` | Moderation, admin-ops |
| BR-039 | **Table owned by `migration_owner`; runtime lacks `UPDATE`/`DELETE`/`TRUNCATE`** | Audit, admin |
| BR-041 | Lint rule + RTL screenshot pass | Every screen |
| BR-044 | Per-type threshold | Events, moderation |
| BR-ADM-001 | **No FK to `admins` + server-side rejection** | Admin-ops, API |
| BR-VIS-001 | Profile-level visibility, `PUBLIC` only | Posts, feed, search |
| BR-VID-001 | Accepted MIME set excludes video | Media, messaging |

*(All 49 mapped; the 23 above are those with more than one dependent component.)*

---

## 4. Security → controls → tests

| SEC | Control | Test |
|---|---|---|
| 001 | Argon2id, host-benchmarked | Unit |
| 003 | Hashed, single-use, 10 min, 5 attempts | Integration |
| 004 | Random hashed token, TLS, Keystore | **B** |
| 005 | Per-account and per-source limits | Rate-limit suite |
| 006 | Uniform body **and timing** | **B** + timing assertion |
| 009 | All checks server-side | **A**, security suite |
| 011 | Object-level on every request | **A**, IDOR sweep |
| 012–013 | Server-side limits, magic-byte inspection | EDGE-014 |
| 014 | Server-side fetch, SSRF guards | SSRF suite |
| 015 | Random keys, listing disabled | Integration |
| 016 | Parameterised queries, output encoding, CSP | Injection + XSS suite |
| 017 | HTTPS only, HTTP refused | Smoke |
| 018 | Sanitised errors | API suite |
| 019 | Block predicate on every path | **A** |
| 020 | Two credential stores | Cross-token rejection |
| 021 | **No schema path + server-side rejection** | Admin-target rejection |
| 022–023 | Append-only, grants asserted in CI | **CI grant check** + audit suite |
| 025 | Environment only, CI scanning | Secret scan |
| 026 | Daily backup, **restore tested** | **REL-007 rehearsal** |
| 028 | Device-log redaction | Mobile audit |

*(All 28 mapped in `10` §2.)*

---

## 5. Edge cases → mechanism → test

| EDGE | Mechanism | Test |
|---|---|---|
| 001 | Idempotency key + `UNIQUE` | Integration |
| 007/008 | `UNIQUE citext`, concurrent claim | Concurrency |
| 009/010 | Session eviction, revocation | **B** |
| 011/013 | Per-file retry, text preserved | Mobile + API |
| 014 | Magic-byte inspection | Security |
| 015/016 | Composite PKs, server-side block | **A** |
| 017/018 | Keyset pagination | Feed |
| 019 | Block mid-conversation, no disclosure | **A** + **E** |
| 020/021 | `UNIQUE (conversation_id, client_message_id)` | **E** |
| 022 | Read-only conversation on deletion | **F** |
| 023 | `UNIQUE (reporter, target)` | **C** |
| **024** | **`version` optimistic lock** | **D** |
| 025/026 | Case auto-close, restore resets count | Moderation |
| 027/028 | Replace duration, derived expiry | Enforcement |
| 029/030 | Identifier reserved, requests withdrawn | **F** |
| 031/032 | Past-event handling, cancellation notice | Events |

*(All 32 mapped.)*

---

## 6. Screens → requirements → API

All **70** screen IDs are mapped in `08` §3 and `06` §4. Coverage:

| Namespace | Screens | Fully mapped |
|---|---|---|
| UX-AUTH | 12 | ✅ |
| UX-SETUP | 3 | ✅ |
| UX-HOME | 7 | ✅ |
| UX-SEARCH | 3 | ✅ |
| UX-CREATE | 4 | ✅ |
| UX-EVENT | 5 | ✅ |
| UX-MSG | 4 | ✅ |
| UX-PROFILE | 6 | ✅ |
| UX-SET | 9 | ✅ |
| UX-SAFE | 4 | ✅ |
| UX-STATE | 4 | ✅ |
| **UX-ADM** | **9** | ✅ — **from UI/UX §27 and SRS §10.14 only** (ARCH-CONFLICT-009) |

---

## 7. Release criteria → gate

| REL | Verified by | Blocked by |
|---|---|---|
| 001 | EPIC-16 E2E, both languages | DEP-010 |
| **002** | **Mandatory test G — RTL through every module** | DEP-011 (OD-016) |
| 003 | **Mandatory test C + D** — full safety loop | — |
| 004 | **Mandatory test A** — IDOR sweep | — |
| 005 | Cold-start check on a seeded platform | DEP-014 (OD-018) |
| 006 | Play submission check | DEP-008 (OD-015) |
| **007** | **Restore rehearsal into a clean environment** | — |
| 008 | Three physical devices | DEP-010 |

🟦 **Five of eight release criteria are gated on Shehersaaz-owned dependencies, not on engineering.** That is the honest position and it is why those items carry owners and dates in `17`.
