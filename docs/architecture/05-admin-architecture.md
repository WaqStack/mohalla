# 05 — Admin Portal Architecture

**Stage 4 · Shehersaaz Community Platform** · Version 1.1 · Status: **Complete**
**Platform:** Next.js · desktop-first · English only (ADR-002)
**⚠ No prototype reference exists for this surface — ARCH-CONFLICT-009. Built from UI/UX §27 and SRS §10.14 only.**


> **Classification legend — used throughout Stage 4 (Guardrail 9)**
>
> | Marker | Meaning |
> |---|---|
> | 🟦 **REQUIREMENT** | Approved in the SRS, Product Scope or UI/UX specification. Not negotiable at this stage. |
> | 🟩 **ARCHITECTURE** | A decision made in Stage 4. Reversible on evidence; recorded in an ADR. |
> | 🟨 **PROPOSED DEFAULT** | A value the approved documents left open. Safe to build; changeable by instruction. |
> | 🟥 **PROPOSED PRODUCT CHANGE** | **Not approved.** Requires product-owner sign-off. Recorded in `17-open-decisions.md`. |


---

## 1. Separation — the defining property

🟦 **REQUIREMENT (SEC-020, S2-CR-005, BR-ADM-001, SEC-021)**

| Rule | 🟩 Implementation |
|---|---|
| Admin credentials never work in the Android app | Separate `admins` table, separate hashing context, separate guard. A user token on `/a` fails at the guard |
| User credentials never work in the portal | Same, inverted |
| **No administrator may act on another administrator** | `enforcement_actions.target_user_id` references `users`. **There is no schema path to target an admin.** The service additionally rejects any resolving admin target |
| **Administrator accounts are not manageable in the portal** | No create, disable or delete route exists — not hidden, absent |
| **No bootstrap endpoint, in any environment** | The first administrator is created by CLI. A public bootstrap route is the classic takeover vector |

🟩 **Provisioning** — the technical owner (OD-020) runs a CLI against the database over an out-of-band channel. It requires the migration credential, which the runtime never holds. Every provisioning action is written to `audit_log`.

---

## 2. Screens

| Screen | Requirement | Note |
|---|---|---|
| UX-ADM-001 Login | AUTH-FR-011 | 8-hour absolute timeout (SEC-024) |
| UX-ADM-002 Dashboard | ADMIN-FR-001/011 | **Open reports is the primary figure** |
| UX-ADM-003 Moderation queue | ADMIN-FR-002 | Severity → count → age |
| UX-ADM-004 Queue item | ADMIN-FR-002/003/004 | **Restore and Delete are peers** |
| UX-ADM-005 Users | ADMIN-FR-005 | Search by username, name, phone, email |
| UX-ADM-006 User detail | ADMIN-FR-005/006/007/008 | **Only surface exposing phone/email/DOB — every view audited** |
| UX-ADM-007 Announcements | ADMIN-FR-009 | Both languages required |
| UX-ADM-008 Verification | ADMIN-FR-010 | Organization accounts only |
| UX-ADM-009 Audit log | ADMIN-FR-012 | **Read-only; no mutation route exists** |

---

## 3. The moderation decision surface

🟦 **REQUIREMENT (ADMIN-FR-003, RSK-010)** — restoring protects legitimate civic criticism from coordinated reporting.

🟩 **ARCHITECTURE** — Restore and Delete are rendered as **equal-weight peers**: same size, same prominence, neither pre-focused, no default. The data model matches — `RESOLVED_RESTORED` and `RESOLVED_DELETED` are sibling states with no primary.

**Why this is an architecture concern and not only a design one:** an API that made deletion the simple path and restoration the exceptional one would bias outcomes over time. RSK-010 is that coordinated reporting silences criticism; the system must not lean toward removal.

**Collision handling (EDGE-024)** — every decision carries `version`. A stale value returns `409 CASE_ALREADY_RESOLVED` naming **who resolved it and how**. 🟩 Rendered as an informational panel, not an error toast — the second administrator needs the outcome, not an apology.

---

## 4. Sensitive access

| Action | 🟦 Rule | 🟩 Implementation |
|---|---|---|
| View phone / email / DOB | PRIV-008 — audited every time | Audit entry written **before** the response is returned |
| Read a reported conversation | PRIV-009 — only via its case | `ADM-API-007` requires a case id originating from MSG-FR-007; bounded excerpt; audited |
| Bulk export | 🟦 **Prohibited** | No endpoint exists |
| Edit user content | 🟦 **Prohibited** — admins delete, never edit | No route |

---

## 5. Responsive behaviour

🟦 UI/UX §24 · NFR-COMP-003 — desktop-first; mobile browser support not required.

| Width | Behaviour |
|---|---|
| ≥1024px | Full: 240px sidebar, 1200px content cap |
| 768–1024px | Sidebar collapses to a 64px icon rail |
| **<768px** | 🟦 **Moderation actions are read-only or unavailable, as specified.** The queue is viewable; decisions are not takeable |

🟩 The narrow-width fallback is **defensive, not a mobile-admin commitment.** A moderation decision requires reading full content, all report reasons and author history — a 360px screen cannot present that responsibly, and enabling it would invite bad decisions. Stated explicitly so it is not later read as a product gap.

---

## 6. Security

| 🟦 Requirement | 🟩 Implementation |
|---|---|
| SEC-016 stored XSS | **The portal renders user-generated content and is the highest-value XSS target.** Output encoding by default; no raw HTML injection; strict CSP |
| SEC-024 timeout | 8-hour absolute, then re-authentication |
| AUTH-FR-011 lockout | 5 failed attempts → 30-minute lockout; every login audited |
| SEC-025 secrets | No admin credential in source or client bundle |

---

## 7. Public surface in the same deployment

🟩 ARCH-CONFLICT-008 — the same Next.js deployment serves the App-Links interstitial (ENGAGE-FR-007) and the policy documents (PRIV-017, SET-FR-008).

**This is a routing boundary, not a trust boundary.** Admin routes sit under an authenticated layout; **no admin data is server-rendered into any public route**; policy pages are static and carry no analytics.
