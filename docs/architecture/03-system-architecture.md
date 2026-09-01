# 03 — System Architecture

**Stage 4 · Shehersaaz Community Platform** · Version 1.1 · Status: **Complete**
**Diagrams:** `system-context` · `container-architecture` · `backend-modules` · `trust-boundaries` · `deployment` · plus seven flow diagrams


> **Classification legend — used throughout Stage 4 (Guardrail 9)**
>
> | Marker | Meaning |
> |---|---|
> | 🟦 **REQUIREMENT** | Approved in the SRS, Product Scope or UI/UX specification. Not negotiable at this stage. |
> | 🟩 **ARCHITECTURE** | A decision made in Stage 4. Reversible on evidence; recorded in an ADR. |
> | 🟨 **PROPOSED DEFAULT** | A value the approved documents left open. Safe to build; changeable by instruction. |
> | 🟥 **PROPOSED PRODUCT CHANGE** | **Not approved.** Requires product-owner sign-off. Recorded in `17-open-decisions.md`. |


---

## 1. Containers

| Container | Technology | Responsibility | Scale unit |
|---|---|---|---|
| **Android app** | Kotlin · Compose · API 26+ | 61 citizen screens, both languages | Per device |
| **Admin Portal + public pages** | Next.js | 9 admin screens; App-Links interstitial; policy documents | One deployment |
| **API + realtime** | NestJS · Socket.IO | 87 endpoints, 5 realtime events, all business rules | 1 instance at launch |
| **Worker** | Same codebase, separate process | 10 job types (`event-catalogue.md` §3) | 1 instance at launch |
| **PostgreSQL** | Managed | Data · FTS · queue · sessions · audit | 1 managed instance |
| **Object storage** | S3-compatible | `quarantine/` (private) and `media/` | Managed |
| **CDN** | 🟩 ADR-012 | Immutable media only. **No API response is ever cached** | Managed |

🟩 **ARCHITECTURE** — API and worker share one codebase and one deployment artefact, started with different entry points. Two developers maintaining two codebases for one product would be worse.

---

## 2. Trust boundaries

| Boundary | Who | What crosses |
|---|---|---|
| **Public** | Unauthenticated | Auth endpoints only (rate-limited, uniform responses), policy pages, App-Links interstitial |
| **Authenticated user** | ROLE-001 / ROLE-002 | `/api/v1/m/**` + Socket.IO. Object-level authorization on every request |
| **Administrator** | ROLE-003 | `/api/v1/a/**`. Separate credential store. **Cannot act on another administrator** |
| **Infrastructure owner** | OD-020 | Admin provisioning CLI, secrets, migration role. **Never an HTTP endpoint** |
| **Third party** | SMS · FCM · CDN · storage | Minimum viable data — see §4 |

🟦 **REQUIREMENT (SEC-020)** — An admin token presented to `/m` fails; a user token presented to `/a` fails. Two credential stores, two session tables, two guards.

---

## 3. Request path

```
Client
  → TLS termination                     (SEC-017 — plain HTTP refused, not redirected)
  → Correlation ID assigned             (SRS §16)
  → Rate limit                          (SEC-005, per account and per source)
  → Authentication guard                (opaque session; revoked → 401 immediately)
  → Capability guard                    (SUSPENDED blocks every write — BR-034)
  → Controller: DTO validation          (SEC-010 — server-side regardless of client)
  → Application service                 (transaction boundary)
      → Object-level authorization      (SEC-011 — ownership / participation)
      → VisibilityPolicy                (SEC-019 — bidirectional block filter)
      → Domain rules                    (SRS §11)
      → Repository
      → Outbox row, same transaction    (ADR-014)
  → Response serializer                 (PublicProfileProjection — PRIV-003)
  → Error sanitiser                     (SEC-018 — no internals ever)
```

🟩 **ARCHITECTURE** — Every one of these is a global interceptor or guard, not per-controller code. A new endpoint inherits all of it by default; forgetting is not possible by omission.

---

## 4. Third-party data minimisation

🟦 **REQUIREMENT (PRIV-012)** — no third-party analytics that profiles individuals.

| Party | Receives | Never receives |
|---|---|---|
| SMS provider | One phone number, one 6-digit code | Name, content, any other user data |
| FCM | Device token, notification template, deep link | Phone, email, DOB, message bodies beyond the preview NOTIF-FR-004 requires |
| CDN | Media object requests | User identifiers — **never in a URL or query string** |
| Object storage | Media bytes under random keys | Original filenames, user identifiers in keys |
| Error tracking | Stack traces, device model, OS version | Personal data — redaction is enforced before send (PRIV-010, SEC-028) |

---

## 5. Failure behaviour

🟦 **REQUIREMENT (NFR-AVAIL-002)** — degrade gracefully; never a blank screen or an unexplained failure.

| Fails | User sees | System does |
|---|---|---|
| Network | Cached content + offline banner; writes disabled with explanation | Nothing — not a fault |
| API 5xx | Plain apology + retry + correlation ID | Full trace logged |
| Database | Maintenance state (NFR-AVAIL-003) | Alert; health check fails; no traffic served |
| Realtime | Silent — messages arrive on next fetch | Client falls back to polling with the **same** `clientMessageId` |
| FCM | Nothing visible | Notifications accumulate in-app; retry then dead-letter |
| SMS | "Couldn't send the code — try again" | Alert. **Blocks registration — DEP-002 is the single point of failure for onboarding** |
| Object storage | Upload fails per file with retry | Text and sibling attachments preserved (EDGE-013) |
| Search | **Explicit unavailable state** | Never an empty result set (SEARCH-FR-003 E3) |
| Worker | Nothing immediately | Queue depth alert; jobs resume on restart — `pg-boss` is durable |

🟩 **ARCHITECTURE** — SMS is the only third party whose failure blocks a core journey. It sits behind a port with a sandbox mode, and provider selection is deferred until Pakistani network coverage is tested (DEP-002, RSK-007).

---

## 6. Growth path

🟦 **REQUIREMENT (NFR-SCAL-002)** — 10,000 registered and 500 concurrent without redesign.

| Trigger | Action | Architectural change |
|---|---|---|
| API CPU sustained high | Scale up | None |
| Realtime thresholds in ADR-009 §Scaling | Add pub/sub adapter, LB WebSocket config, connection drain | **First Redis** |
| Database saturated | Scale up, then read replica for feed reads | Feed repository targets the replica |
| Queue latency > 60 s p95 sustained | Second worker | None |
| Storage growth | Lifecycle policies | Cost control (RSK-013) |

🟩 **ARCHITECTURE** — Vertical scaling first, every time. It is cheapest and needs no architectural work. **Idempotency must remain in PostgreSQL, never in the transport, when realtime scales** — a mandatory review item.
