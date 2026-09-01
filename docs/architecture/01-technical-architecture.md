# 01 — Technical Architecture Overview

**Stage 4 · Shehersaaz Community Platform (Mohalla — محلہ)**
Version 1.1 · Status: **Complete** · Entry point for every other Stage 4 document


> **Classification legend — used throughout Stage 4 (Guardrail 9)**
>
> | Marker | Meaning |
> |---|---|
> | 🟦 **REQUIREMENT** | Approved in the SRS, Product Scope or UI/UX specification. Not negotiable at this stage. |
> | 🟩 **ARCHITECTURE** | A decision made in Stage 4. Reversible on evidence; recorded in an ADR. |
> | 🟨 **PROPOSED DEFAULT** | A value the approved documents left open. Safe to build; changeable by instruction. |
> | 🟥 **PROPOSED PRODUCT CHANGE** | **Not approved.** Requires product-owner sign-off. Recorded in `17-open-decisions.md`. |


---

## 1. What is being built

🟦 **REQUIREMENT** — An Android application and an Admin Web Portal for a bilingual civic community platform in Pakistan. 124 functional requirements, 15 modules, 70 screens. Authentication required; no guest browsing. Urdu and English are peers, with full right-to-left mirroring. 1,000 registered users at launch, growing to 10,000 without redesign.

🟩 **ARCHITECTURE** — A modular monolith in TypeScript (NestJS) behind a native Kotlin/Compose Android client, on one PostgreSQL database, deployed on managed infrastructure, operated by two developers.

---

## 2. The five decisions that shape everything else

| # | Decision | Driven by | Consequence if reversed |
|---|---|---|---|
| 1 | 🟩 **Modular monolith, not services** (ADR-005) | Two developers; atomic moderation and outbox requirements | Distributed transactions where SAFETY-FR-004 needs one |
| 2 | 🟩 **Server-backed opaque sessions, not JWT** (ADR-008) | BR-035 + EDGE-010 demand revocation within one request cycle | A banned user keeps access for the token's lifetime |
| 3 | 🟩 **One PostgreSQL for data, search, queue and audit** (ADR-004) | No DBA; audit immutability needs database privileges | Three more services to secure, monitor and back up |
| 4 | 🟩 **Fan-out on read** (ADR-020) | BR-026 chronological; block and moderation changes must apply instantly | Timeline repair on every block and every auto-hide |
| 5 | 🟩 **Client-generated message IDs** (ADR-009) | EDGE-020/021 require exactly-once rendering | Duplicate messages on retry or transport switch |

**None of the five is a preference.** Each is the cheapest arrangement that satisfies a requirement the SRS states explicitly.

---

## 3. Layered view

```
┌──────────────────────────────────────────────────────────────┐
│ CLIENTS                                                      │
│  Android (Kotlin/Compose) · Admin Portal (Next.js)           │
└──────────────────────────────────────────────────────────────┘
                    │ REST + Socket.IO over TLS
┌──────────────────────────────────────────────────────────────┐
│ TRANSPORT      controllers · gateway · guards · validation   │
├──────────────────────────────────────────────────────────────┤
│ APPLICATION    use cases · transactions · authorization      │
├──────────────────────────────────────────────────────────────┤
│ DOMAIN         49 business rules · state machines            │
├──────────────────────────────────────────────────────────────┤
│ DATA           repositories · VisibilityPolicy               │
└──────────────────────────────────────────────────────────────┘
        │                    │                    │
   PostgreSQL          Object storage        Ports: SMS · FCM
   (+ pg-boss)          (+ CDN)              · email
```

🟩 **ARCHITECTURE** — A business rule never lives in a controller. The transaction boundary is always the application service. Authorization is a guard *plus* an explicit object-level check (SEC-011).

---

## 4. How the hardest requirements are met

| Requirement | Mechanism | Where |
|---|---|---|
| 🟦 Block never disclosed (BR-025) | One `VisibilityPolicy` composed by **every** read path; one neutral 404 for deleted/hidden/blocked/banned/nonexistent | `06` §5, `08` §2 |
| 🟦 Revocation within one request cycle (EDGE-010) | Opaque session row; revocation is an `UPDATE` | ADR-008 |
| 🟦 Threshold auto-hide, never auto-delete (SAFETY-FR-004) | Report insert + distinct count + visibility change in **one transaction** with `FOR UPDATE` | `07` §6.6 |
| 🟦 Audit cannot be edited (SEC-023) | Table owned by a role the runtime never uses; `UPDATE`/`DELETE`/`TRUNCATE` never granted | ADR-018 |
| 🟦 Exactly-once message render (EDGE-021) | `UNIQUE (conversation_id, client_message_id)` — **in PostgreSQL, never in the transport** | ADR-009 |
| 🟦 Phone never visible (PRIV-003) | `PublicProfileProjection` has no such field to populate | `06` §5 |
| 🟦 Uploads verified by content (SEC-013) | Presigned → private quarantine → magic-byte inspection → promotion | ADR-013 |
| 🟦 Immediate language switch with full mirroring (LOCALE-FR-002/003) | Native Android configuration change; logical start/end properties only | ADR-001, `04` |
| 🟦 Feed never empty (FEED-FR-002, RSK-001) | Featured is an **independent endpoint** that cannot be delayed by follow data | ADR-020 |
| 🟦 Deletion is a lifecycle (SET-FR-004) | Explicit state machine + scheduled erasure + per-module anonymisation contract | ADR-019 |

---

## 5. Document map

| Document | Answers |
|---|---|
| `00-source-baseline.md` | What was read, what conflicts, what drives the architecture |
| `02-technology-stack.md` | Every layer, with alternatives and revisit triggers |
| `03-system-architecture.md` | Containers, trust boundaries, data flows |
| `04-mobile-architecture.md` | Android structure, RTL, offline, tokens |
| `05-admin-architecture.md` | Portal, separation, provisioning |
| `06-backend-modules.md` | 15 modules, dependency rules, shared contracts |
| `07-database-design.md` | 33 tables, constraints, state machines, races |
| `08-api-architecture.md` | 87 endpoints, conventions, privacy rules |
| `09-authentication-authorization.md` | Sessions, roles, object-level checks |
| `10-security-privacy.md` | Threat model, SEC-001…028, PRIV-001…019 |
| `11-media-feed-search.md` | Upload pipeline, feed queries, Roman Urdu |
| `12-messaging-notifications.md` | Realtime, idempotency, outbox |
| `13-moderation-audit.md` | Report → decision → audit |
| `14-infrastructure-environments.md` | Environments, deployment, CI/CD |
| `15-testing-observability-recovery.md` | Test architecture, monitoring, backup |
| `16-implementation-epics.md` | Ordered epics, critical path, cut order |
| `17-open-decisions.md` | What is still open, who owns it |
| `18-requirements-architecture-traceability.md` | Every requirement → components, APIs, tests |

---

## 6. What this architecture deliberately does not include

🟩 Kubernetes · Kafka · Elasticsearch · Redis · event sourcing · CQRS · service mesh · GraphQL · microservices · video infrastructure · third-party product analytics.

Each is excluded with a named revisit trigger in `02` §6. **None is excluded on taste; each is excluded because no requirement needs it at the approved scale.**
