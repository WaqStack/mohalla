# 13 — Moderation & Audit

**Stage 4 · Shehersaaz Community Platform** · Version 1.1 · Status: **Complete**
**Diagram:** `moderation-flow.mmd` · **Decisions:** ADR-018
**⚠ No prototype reference — ARCH-CONFLICT-009. Built from UI/UX §27 and SRS §10.14 only.**

> 🟦 **REQUIREMENT** approved · 🟩 **ARCHITECTURE** decision · 🟨 **PROPOSED DEFAULT** changeable · 🟥 **PROPOSED PRODUCT CHANGE** not approved

---

## 1. Lifecycle

```
report → unique-reporter constraint → distinct count → threshold check
   → auto-hide (never delete) → moderation case → human decision
   → mandatory reason → append-only audit → author notified
```

🟦 **BR-032 — nothing is ever deleted automatically. A human makes every permanent decision.** The SRS is explicit about why: on a civic platform, wrongly deleting a citizen's criticism is worse than briefly hiding it.

---

## 2. Thresholds

| Content | Threshold | Requirement |
|---|---|---|
| Post | 3 distinct reporters | BR-032 |
| Comment | 3 | BR-032 |
| **Event** | **2** | **BR-044 / S2-CR-003** — a fake gathering wastes real travel |
| Profile | **Never** | SAFETY-FR-002 — hiding a person on report count would be trivially weaponised |
| Direct message | **Never** | Private; a threshold is meaningless between two people |

🟩 **Atomicity** — report insert, distinct-count recompute and visibility change occur in **one transaction** with `SELECT … FOR UPDATE` on the target. Two simultaneous threshold-reaching reports cannot double-hide or miss. **Mandatory test C.**

🟦 **EDGE-023** — `UNIQUE (reporter_id, target_type, target_id)`. A repeat report returns the **same acknowledgement without incrementing**, so the reporter cannot infer the tally.

---

## 3. Author visibility

🟦 **PROFILE-FR-004** — the author still sees their own auto-hidden content, marked *Under Review*. 🟩 The engagement row is removed on that variant — there is nothing to like or comment on while it is hidden from everyone else. Every other viewer receives the neutral 404.

---

## 4. Decision

🟦 ADMIN-FR-002/003/004 · BR-038 · EDGE-024/025/026

Queue ordered **severity → distinct count → age**. The item view carries full content, all reasons and notes, and the author's enforcement history — 🟩 so proportionality can be judged without navigating away.

🟩 **Restore and Delete are peers.** Sibling states, equal API weight, equal visual weight, no default. **RSK-010 is that coordinated reporting silences legitimate criticism; a system that leans toward removal makes that risk worse.**

| Outcome | Effect |
|---|---|
| **Restore** | Visible again; **report count resets to zero** so the same reporters cannot immediately re-hide it (ADMIN-FR-003) |
| **Delete** | Permanent; author notified with the reason (ADMIN-FR-004) |
| **No action** | Case closed, content unchanged |

Every outcome requires a reason of ≥5 characters — 🟩 a `CHECK` constraint, not a validator.

**Collision (EDGE-024)** — `version` column. A stale decision returns `409` naming **who resolved it and how**, rendered as information rather than an error. **Mandatory test D.**

**Author deletes first (EDGE-025)** — case auto-closes as `CLOSED_AUTHOR_DELETED`.

**Repeat offender (BR-037)** — three admin-confirmed deletions in 30 days **flags** the account for a suspension decision. 🟦 **It is not auto-suspended.**

---

## 5. Enforcement

| Action | Effect | Requirement |
|---|---|---|
| Suspend 24 h / 7 d / 30 d | Read-only; **all sessions revoked**; banner with reason and expiry; **lifts automatically** | BR-034/035, EDGE-028 |
| Ban | No login; profile and content hidden **but retained** for the audit trail; identifier hash added to the ban list | ADMIN-FR-007, BR-036 |
| Reinstate | Returns to ACTIVE; content visible again | ADMIN-FR-008 |
| **Any action against an administrator** | 🟦 **Impossible — no schema path, no route** | BR-ADM-001, SEC-021 |

🟦 **EDGE-027** — re-suspending **replaces** the duration rather than accumulating.

---

## 6. Audit

🟦 BR-039 · SEC-022/023 · ADMIN-FR-012

🟩 **Append-only, protected from mutation by application and administrator roles.** Owned by `migration_owner`; `runtime_app`/`runtime_worker` hold `SELECT`+`INSERT` only; `UPDATE`, `DELETE` and `TRUNCATE` are never granted. The ORM repository exposes `append()` and `query()` only. No admin API mutates it. CI asserts the grants each deploy. Backups include it and restore rehearsals verify its row count.

**Recorded:** enforcement · verification · publication · **sensitive-data views** (phone, email, DOB) · **reported-conversation access** · every admin login.

🟩 **Viewing is auditable, not only acting.** That is what makes PRIV-008 and PRIV-009 verifiable rather than aspirational.

🟩 **Not cryptographic immutability.** The infrastructure owner retains emergency database capability, which cannot be revoked without making the system unrecoverable. Optional chained-hash or signed-digest tamper evidence is evaluated in ADR-018 and **deliberately not adopted** for V1.

**Retention** — audit entries survive account erasure, holding the pseudonymous user id and no personal data. 🟦 *Legal confirmation under OD-019.*
