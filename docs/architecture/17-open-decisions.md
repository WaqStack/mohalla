# 17 — Open Decisions

**Stage 4 · Shehersaaz Community Platform** · Version 1.2 · **Post-approval register**
**Updated 1 September 2026 — Stage 4 approved and frozen**

> 🟦 **REQUIREMENT** approved · 🟩 **ARCHITECTURE** decision · 🟨 **PROPOSED DEFAULT** changeable · ✅ **DECIDED** by the product owner
>
> **All four product decisions are now closed.** What remains are release and content dependencies owned by Shehersaaz, plus two Stage 3 design corrections. **None blocks Stage 5.**

---

## 1. Product decisions — ALL CLOSED ✅

### ✅ OD-021 — V1 identity · **Option C** · approved 1 September 2026

**Question asked:** *"What identity must every V1 account possess so that a permanent ban can be enforced consistently?"*

**Decision:** **Every normal V1 user account must possess a verified Pakistani mobile number.** Phone + SMS OTP is the required registration and identity mechanism.

| | |
|---|---|
| AUTH-FR-004 | **Removed from V1** as an approved product change |
| `EMAIL_PRIMARY` accounts | **Not implemented** |
| Email | Optional **secondary** recovery/contact information only |
| BR-036 | **Unchanged** |
| Anti-enumeration | **Preserved unchanged** |
| Extensibility | `user_identifiers` stays polymorphic; `CHECK (NOT is_primary OR kind = 'PHONE')` is the single line a future version relaxes |

**Why C rather than the B I leaned toward:** B keys the ban list differently but leaves durability depending on which identifier an account happens to hold. C binds the ban to an identity **every account is required to hold** — the only arrangement where BR-036 means the same thing for every user.

**Accepted cost, stated plainly:** email registration was the SRS's named partial mitigation for SMS-delivery risk (RSK-007). **That mitigation is given up.** RSK-007 now rests entirely on provider selection, sandbox testing and network-coverage validation before launch — which makes DEP-002 the single most important external dependency in the project.

**Recorded in:** ADR-021 · `00` · `07` · `08` · `09` · `16` · `18` · OpenAPI · `STAGE-4-APPROVAL.md`

---

### ✅ OD-022 — Message Requests · **promoted to MUST** · approved 1 September 2026

MSG-FR-005 moves from Should to **Must** for implementation planning, closing the contradiction with NOTIF-FR-004 (already Must).

**Behaviour preserved:** non-follower first message → Message Request · **no push notification** · reading sends **no read receipt** · accept moves it to the normal inbox · **decline gives the sender no signal** · block applies normal blocking rules.

**Now on the Must critical path and removed from the MoSCoW cut order.**

**Recorded in:** `00` · `12` · `16` · `18` · `STAGE-4-APPROVAL.md`

---

### ✅ OD-011 — Delivery timeline · approved 1 September 2026

| | Working days |
|---|---|
| **Committed planning baseline** | **68** |
| Internal stretch target | **~65** |

**The schedule may not be met by:** removing private messaging · removing essential safety controls · skipping RTL · reducing QA · bypassing security work · skipping staging · skipping physical-device testing.

**Must requirements are protected first.** Under pressure, the approved cut order in `16` §5 applies — and Message Requests are no longer in it.

**Recorded in:** `16` §1, §4, §5 · `STAGE-4-APPROVAL.md`

---

### ✅ OD-023 — PDF attachment · **CONDITIONAL SHOULD** · revised and approved 1 September 2026

**The earlier proposal — *"magic-byte only, no malware scanning"* — was NOT approved and is withdrawn.**

🟦 SEC-013 requires executable content to be rejected from **every** upload path. A valid PDF signature is not evidence of safety, and **a Should feature may not weaken a Must security requirement.**

**Required before PDF ships:** verify actual PDF **structure**, not the extension · reject malformed files · reject detectable embedded executable/active content · quarantine never exposed · randomised final keys · 10 MB enforced server-side · device viewer only.

**Production gate:** the **Technical Lead must approve the selected inspection/sanitisation capability** before PDF is enabled in production. Evaluated during EPIC-06.

**If no practical safe mechanism fits V1: CUT PDF FROM V1.** POST-FR-005, MEDIA-FR-003 and MEDIA-FR-004 are Should, so removal does not block the MVP. Images remain Must and are unaffected.

**Recorded in:** ADR-022 · ADR-013 · `11` · `16` · `18` · `STAGE-4-APPROVAL.md`

---

## 2. Legal / policy — OPEN · owner: Shehersaaz

### 🟦 OD-019 — Pakistani regulatory position
Data residency · retention · breach notification · PECA/PTA obligations. Also governs **ARCH-CONFLICT-004** (a deleted user's message bodies retained for the counterpart) and audit retention beyond erasure.
🟩 **Architecture meanwhile:** region deferred (ADR-016); message body retained with the identity link erased; audit retained pseudonymously. **No legal claim is made anywhere in Stage 4.**
**Needed by:** before launch · **Blocks:** region selection, not design

### 🟦 OD-015 — Legal documents · **BLOCKS RELEASE**
Terms, Privacy Policy and Community Guidelines, both languages, publicly reachable.
🟦 **Google Play rejects submission without a live Privacy Policy URL** (PRIV-017).
**Needed by:** before Play submission

---

## 3. Content and organisational dependencies — OPEN · owner: Shehersaaz

| ID | Item | Blocks | Architecture meanwhile |
|---|---|---|---|
| **OD-016** | ~400 Urdu strings (DEP-011) | **Release** — REL-002 | English keys ship; **CI fails on a missing Urdu key** |
| **OD-017** | Category list, both languages (DEP-012) | Development of POST-FR-006, FEED-FR-006 | 🟨 The 11 from UI/UX §15 are seeded |
| **OD-018** | Seed content and accounts (DEP-014) | **Launch** — RSK-001 | Seed tooling is an architecture deliverable |
| **OD-020** | **Named technical owner** (DEP-016) | **Release** — no route to the first admin without one | CLI built; **no bootstrap endpoint exists** |
| OD-014 | Final product name | Play submission | Working title |

---

## 4. Stage 3 design corrections — OPEN

| ID | Correction | Blocks |
|---|---|---|
| **ARCH-CONFLICT-006** | Attendee avatar stack contradicts EVENT-FR-004. **SRS wins** — no attendee endpoint exists in V1 | UX-EVENT-003 implementation |
| **ARCH-CONFLICT-009** | Prototype P-12 is "Delete account", not "Admin moderation"; **the prototype has no admin screens**. Reconcile numbering before final UX handoff | Nothing — admin is built from UI/UX §27 and SRS §10.14 |

---

## 5. Values to fix at EPIC-00 🟨

Framework and runtime versions · PostgreSQL major version and UUIDv7 generation strategy · **Argon2id parameters, benchmarked on the chosen host** · **SMS provider after Pakistani network coverage testing** · hosting provider and region after latency measurement · Urdu typeface licence · **PDF inspection capability (OD-023 gate)**.

🟩 **None is a decision — each is a value to measure and record.**

---

## 6. Register status

| Category | Open | Closed |
|---|---|---|
| **Product decisions** | **0** | **4** ✅ |
| Legal / policy | 2 | 0 |
| Content / organisational | 5 | 0 |
| Design corrections | 2 | 0 |
| EPIC-00 values | 7 | 0 |

✅ **Every product decision required for Stage 4 approval is closed.** The remainder are Shehersaaz-owned release dependencies and Stage 3 corrections. **None blocks Stage 5.**
