# ADR-019 — Account deletion: explicit lifecycle with grace, anonymisation and erasure

**Status:** Accepted · **legal confirmation outstanding**
**Date:** 1 September 2026
**Drivers:** D-13 · relates to ARCH-CONFLICT-004

## Context

SET-FR-004 and BR-009 define a three-phase model. The account deactivates immediately; a 30-day grace period allows self-service restoration by logging in (SET-FR-005); after 30 days personal data is permanently erased (PRIV-007) while posts and comments remain, attributed to *"Deleted User"* (BR-009).

BR-008 makes deletion available in any state except already-deleted, **including while suspended** — a suspension must not trap someone in the product. BR-046 says conversations disappear from the deleting user's side while the counterpart retains their copy.

EDGE-029 and EDGE-030 add cases: re-registering the same number on day 10 must be refused and redirected to restoration; pending message requests are withdrawn.

## Decision

**An explicit state machine with a scheduled erasure job. Not a boolean flag.**

```
ACTIVE ──delete──► PENDING_DELETION ──30 days──► DELETED (terminal)
   ▲                      │
   └──── login + restore ─┘   (SET-FR-005, within 30 days only)
```

### Immediately on request
Password re-entry required (SET-FR-004). Account state becomes `PENDING_DELETION`. **All sessions invalidated** (BR-035). Profile disappears from search, feeds, follower lists and suggestions. Posts and comments **remain visible**, attributed to "Deleted User". Pending message requests are withdrawn (EDGE-030). The registered identifier remains reserved, so re-registration is refused and the user is directed to restore (EDGE-029, EDGE-003).

### During grace
Login succeeds and offers restoration (UX-AUTH-012). Restoring returns state to `ACTIVE` with profile, followers, following and post attribution intact (SET-FR-005).

### At day 30 — irreversible
Personal data erased: phone, email, date of birth, display name, photo, city, bio, device tokens, sessions. Posts and comments **retain their text** but are **repointed to a permanent anonymous actor**, carrying no link back to the deleted identity (PRIV-007). Media authored by the user is deleted. The identifier hash moves to a reserved list so it cannot be recycled while a ban or dispute could still apply.

## Anonymisation, per entity

| Entity | Treatment | Requirement |
|---|---|---|
| Profile | Erased | PRIV-007 |
| Posts | Text retained, author → anonymous actor | BR-009 |
| Comments | Text retained, author → anonymous actor | BR-009 |
| Likes | Retained as counts; actor anonymised | ENGAGE-FR-006 |
| Events created | Retained if future; organiser anonymised | EVENT-FR-005 |
| RSVPs | Removed from counts | EVENT-FR-004 |
| **Messages sent** | **Body retained for the counterpart; sender → anonymous actor** | **BR-046 · ARCH-CONFLICT-004** |
| Reports filed | Retained with anonymised reporter — moderation history must survive | ADMIN-FR-002 |
| Audit entries about the user | Retained, pseudonymous | ADR-018 |

## The unresolved point — stated plainly

**ARCH-CONFLICT-004.** PRIV-007 requires permanent erasure; BR-046 says the counterpart keeps their copy of a conversation, which contains messages the deleted user wrote.

**Default applied:** retain the message **body** as the counterpart's own record; erase the **identity link**. The conversation is equally the counterpart's data, and deleting one side of a two-party record destroys the other party's history.

**This requires legal confirmation under OD-019 before launch.** The SRS already marks BR-046 and PRIV-006/007 as Legal review.

## Why a state machine

Deletion has three distinct phases with different visibility, different reversibility and a scheduled transition. A boolean cannot express "invisible but restorable", cannot drive the day-30 job, and cannot distinguish restorable from terminal. EDGE-029 alone requires the distinction.

## Concurrency
Restoration is guarded against the erasure job by row locking and a state check inside one transaction. **A restore at day 29 and an erasure at day 30 cannot interleave** — whichever commits first determines the outcome, and the second observes the new state and aborts.

## Benefits
Each phase is explicit and testable; the day-30 job is idempotent; restoration is self-service with no admin involvement.

## Disadvantages
Per-entity anonymisation logic is real work and must be maintained as entities are added — mitigated by a registry each module implements.

## Security impact
Erasure is irreversible, so the job is heavily tested and runs dry-run in staging first.

## Privacy impact
The core of PRIV-005/006/007. **Users must be told before confirming that posts remain as "Deleted User"** — the SRS notes this differs from the erasure many will assume, and UX-SET-009 enumerates it.

## Operational impact
One daily job; a dry-run mode; a metric for pending deletions.

## Revisit trigger
Legal guidance under OD-019 altering retention or anonymisation.
