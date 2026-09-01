# 02 — Technology Stack Selection

**Stage 4 · Shehersaaz Community Platform (Mohalla — محلہ)**
Version 1.1 · Status: **Selected**

> Selection is driven by the driver matrix in `00-source-baseline.md` §5, which is derived from requirement IDs. No layer was chosen first and justified afterwards.

---

## 1. Version verification policy

Per the Stage 4 brief, versions are recorded **only** where verified against official documentation during this stage. Everything else is marked **VERIFY** and must be pinned at EPIC-00 before any dependency is installed.

| Fact | Status | Source |
|---|---|---|
| PostgreSQL provides built-in `uuidv7()` and `uuidv4()`; documented for PostgreSQL 18 | ✅ **Verified 1 Sept 2026** | postgresql.org — Functions: UUID |
| React Native `I18nManager.forceRTL()` / `allowRTL()` take effect only *"on the next application start, not immediately"*; docs warn forcing RTL *"requires a full app restart… poor user-experience"* | ✅ **Verified 1 Sept 2026** | reactnative.dev — I18nManager |
| React Native supports a per-view `direction` layout prop `enum('inherit','ltr','rtl')`, root default from locale | ✅ **Verified 1 Sept 2026** | reactnative.dev — Layout Props |
| Kotlin / AGP / Compose BOM / NestJS / Next.js / Node LTS stable versions | ⚠️ **VERIFY at EPIC-00** | Not verified in this stage |

**Outside research is separated from approved requirements.** The three verified facts above informed ADR-001; they are not product requirements and are cited as external sources.

---

## 2. Layer selection summary

| Layer | Options evaluated | **Selected** | Why | Disadvantages accepted | Revisit trigger |
|---|---|---|---|---|---|
| **Mobile** | Native Kotlin + Compose · React Native + TS · Flutter | **Kotlin + Jetpack Compose** | Android-only V1, API 26+, 2 GB RAM, 4 s cold-start budget, mature restart-free runtime RTL, no cross-platform requirement in scope | Second language; iOS would need a new UI layer | iOS enters an approved scope; or a third client platform is approved |
| **Admin web** | Next.js · React + Vite | **Next.js (App Router)** | One deployment also serves the App-Links interstitial (ENGAGE-FR-007) and the public policy pages (PRIV-017) that ARCH-CONFLICT-008 requires | Heavier than a pure SPA for a behind-auth tool | Admin grows to need a separate deployment lifecycle |
| **Backend** | NestJS · FastAPI · ASP.NET Core | **NestJS (TypeScript)** | Its module system encodes the 15 product boundaries directly, which is what makes AI agents safe to point at one feature; shares TypeScript with admin and contracts | Node CPU-bound work is weaker; DI adds ceremony | A module needs a runtime Node cannot serve |
| **Database** | PostgreSQL · MySQL | **PostgreSQL** (major version set at EPIC-00) | FTS + `pg_trgm` for Roman Urdu, partial indexes, JSONB, strong constraints, and a job queue — one engine covers search, queue and data. **No version-18-only feature is required** (ADR-007) | Single engine is a single failure domain | A workload is measured to need a different engine |
| **Realtime** | Native WebSocket · Socket.IO · Managed service · Polling | **Socket.IO, in the API process** | Reconnection, acknowledgements, rooms and fallback come free; ≤500 concurrent fits one process | Horizontal scaling needs a Redis adapter | **>1 API instance**, or concurrent connections approach ~500 |
| **Cache / jobs** | Redis · Redis+BullMQ · DB-backed queue · none | **`pg-boss` on PostgreSQL. No Redis.** | Outbox, push fan-out, reminders, erasure and suspension expiry are low-volume scheduled work. Redis would be infrastructure the team pays to operate and does not need | Lower throughput ceiling; queue load sits on the primary database | Horizontal scaling (Socket.IO adapter), measured queue contention, or rate-limiting contention |
| **Search** | PG FTS + trigram · Elasticsearch · OpenSearch | **PostgreSQL FTS + `pg_trgm` + normalised transliteration column** | BR-042 requires best-effort, not exhaustive. A separate engine at 1,000 users is unjustified operational load | Roman Urdu recall will be imperfect (RSK-012) | Measured user dissatisfaction, or corpus growth past ~10⁶ posts |
| **Object storage** | S3-compatible · provider-native | **S3-compatible** | Portable API; avoids lock-in; every candidate host offers one | Provider-specific features unavailable | — |
| **Media delivery** | Direct from storage · Storage + CDN · Managed image service | **Evaluated in §5 — decision recorded in ADR-012** | Not an SRS requirement; an architecture decision | — | Measured latency or egress cost |
| **Push** | FCM | **Firebase Cloud Messaging** | The only realistic Android push transport | Google dependency | — |
| **SMS / OTP** | *(deliberately unselected)* | **Provider port + adapter** | DEP-002 unverified. Coverage, cost and reliability on Pakistani networks must be tested before any provider is chosen | Integration work deferred | Provider selected after network testing |
| **Email** | Transactional provider | **Provider port + adapter** | Only needed if AUTH-FR-004 is retained (OD-021) | — | OD-021 resolves |
| **Hosting** | Managed PaaS · IaaS | **Managed PaaS + managed PostgreSQL** | No DBA, no SRE, no Kubernetes specialist available | Less control; provider ceilings | Cost or capability ceiling reached |
| **Repository** | Monorepo · multi-repo | **Monorepo** | Shared contracts, design tokens and localization; one PR can span API + app | Mixed Gradle/Node CI | Team grows beyond ~6 developers |
| **API style** | REST · GraphQL | **REST** | One client, no over-fetch problem pagination does not solve; per-field authorization and rate limiting are harder in GraphQL given SEC-011 | Some endpoint proliferation | Multiple divergent clients appear |
| **Identifiers** | bigint · UUIDv4 · UUIDv7 · ULID | **UUIDv7** | Time-ordered index locality, non-enumerable, native in PostgreSQL 18 | 16 bytes vs 8 | — |
| **Sessions** | JWT · opaque server-backed · hybrid | **Opaque, server-backed** | ARCH-CONFLICT-001 — immediate revocation and 5-device eviction both require server state | A database read per request | Read latency measured as a bottleneck |

---

## 3. Mobile — the comparison in full

**This is a comparative selection, not an elimination.** All three candidates can build this product.

### 3.1 The RTL question, stated accurately

D-01 requires that a language switch takes effect **immediately** and that the **entire interface mirrors** (LOCALE-FR-002, LOCALE-FR-003, BR-041, REL-002). The requirement names a behaviour; it does not name a framework.

| Framework | Runtime RTL behaviour | Assessment |
|---|---|---|
| **Jetpack Compose** | Layout direction resolves from configuration; `LocalLayoutDirection` can be overridden. Locale change triggers activity recreation, which is fast and is the platform's expected mechanism. Android's RTL support is mature and applies to the whole view system. | ✅ Direct fit |
| **Flutter** | `Directionality` is an inherited widget; changing it rebuilds the subtree immediately with no restart. Flutter renders its own widgets, so mirroring is consistent by construction. | ✅ Direct fit |
| **React Native** | ⚠️ Mixed. `I18nManager.forceRTL()`/`allowRTL()` are documented as taking effect **only on next application start** — the docs explicitly warn against forcing RTL in production for that reason. **However**, RN also exposes a per-view `direction` layout prop (`inherit`/`ltr`/`rtl`) via Yoga, which *can* be set at runtime. A root-level `direction` switch is therefore technically possible without a restart. | ⚠️ Viable with caveats |

**The honest caveat on React Native:** the per-view `direction` prop changes *layout*, but the ecosystem convention is `I18nManager.isRTL`, which would **not** flip under that approach. Any third-party component that branches on `I18nManager.isRTL` — navigation libraries, gesture handlers, list components — would not mirror. Delivering LOCALE-FR-003 across 61 screens would require either avoiding such components or auditing every one of them.

**Conclusion:** React Native is **not impossible**; it is **higher-risk for this specific requirement**, and the risk lands on RSK-004, already the project's highest-ranked technical risk. That is a reason to prefer another option, not a proof of impossibility.

### 3.2 Full comparison

| Criterion | Kotlin + Compose | Flutter | React Native |
|---|---|---|---|
| Android-only V1 (NFR-COMP-004) | ✅ Exactly the target | ⚠️ Pays cross-platform cost unused | ⚠️ Same |
| API 26 support (NFR-COMP-001) | ✅ Native | ✅ Supported | ✅ Supported |
| 2 GB RAM · 4 s cold start (NFR-COMP-002, NFR-PERF-003) | ✅ No extra runtime | ⚠️ Engine adds startup and memory | ⚠️ JS runtime + bridge adds startup |
| APK size | ✅ Smallest | ⚠️ Engine baseline | ⚠️ Runtime baseline |
| **Runtime RTL (D-01)** | ✅ Mature | ✅ Mature | ⚠️ Viable, ecosystem caveats |
| Urdu font bundling (LOCALE-FR-004) | ✅ Direct | ✅ Direct | ✅ Direct |
| On-device image compression (MEDIA-FR-001) | ✅ Platform APIs | ✅ Plugins | ✅ Libraries |
| Secure token storage (SEC-004) | ✅ EncryptedSharedPreferences / Keystore | ✅ Plugin | ✅ Library |
| Accessibility & font scaling (NFR-ACC-001/004) | ✅ Native | ⚠️ Own semantics layer | ⚠️ Bridged |
| Language shared with backend | ❌ Kotlin ≠ TS | ❌ Dart ≠ TS | ✅ TypeScript |
| iOS path (Phase 2) | ❌ New UI layer | ✅ Reuse | ✅ Reuse |
| AI-agent code quality | ✅ Very well represented | ✅ Well represented | ✅ Very well represented |
| Team learning burden | Kotlin + Compose | **Dart — a third language** | ✅ Lowest |

### 3.3 Selection

**Kotlin + Jetpack Compose is the recommended option after comparison.**

The decision rests on four approved facts, in order of weight:

1. **V1 is Android-only** (NFR-COMP-004). Cross-platform capability is unused in V1, and paying its complexity cost now requires demonstrated value that the approved scope does not provide.
2. **The device floor is hard** (NFR-COMP-002, NFR-PERF-003). API 26 on 2 GB with a 4-second cold-start budget is where an additional runtime layer costs the most.
3. **RTL is the project's top technical risk** (RSK-004, REL-002). Compose has the fewest unknowns here.
4. **iOS is explicitly Phase 2 / out of scope**, and there are two developers. Optimising V1 for a deferred platform is the wrong trade.

**Flutter is the closest alternative** and would be the stronger choice if iOS were pulled into V1 — it matches Compose on RTL and rendering consistency. It loses on a third language for a two-person team and on runtime overhead at the device floor.

**React Native remains viable** and would be reconsidered if the team's TypeScript-only leverage were judged decisive; the RTL ecosystem caveat is the reason it is not selected.

Recorded in **ADR-001**.

---

## 4. Backend, database, realtime, jobs

### 4.1 Backend — NestJS

| Criterion | NestJS | FastAPI | ASP.NET Core |
|---|---|---|---|
| Module boundaries for 15 modules (NFR-MAIN-001) | ✅ First-class, compiler-enforced imports | ⚠️ Convention only | ✅ Good |
| Shares language with admin + contracts | ✅ TypeScript | ❌ Third language | ❌ Third language |
| Realtime in-process | ✅ Socket.IO gateway built in | ⚠️ Separate concern | ✅ SignalR |
| AI-agent safety | ✅ Highly conventional structure | ⚠️ Freeform | ✅ Conventional |
| Team fit (2 devs, TS on admin) | ✅ | ⚠️ | ⚠️ |

**Selected: NestJS.** Its module system *is* the boundary enforcement the modular monolith needs — fifteen product modules become fifteen NestJS modules with explicit imports, which is precisely the constraint that lets an AI agent work on one feature without reaching into another. **ADR-003.**

### 4.2 Database — PostgreSQL 18

Selected for: full-text search and `pg_trgm` (removing the need for a search engine), partial and expression indexes, JSONB, `CHECK` and `EXCLUDE` constraints (which carry business rules into the database per NFR-MAIN-002), a usable job queue, and native `uuidv7()`.

MySQL was rejected on search capability, weaker constraint expressiveness and no comparable trigram support. **ADR-004.**

> **UUIDv7 has two equally valid generation strategies** (ADR-007): database-native `uuidv7()` where the service exposes it, or application-generated RFC-compatible UUIDv7 behind an `IdGenerator` port. The identifier format is byte-identical either way, so **the database version does not constrain hosting selection**. Confirm the host's major version at EPIC-00 and pick the strategy then.

### 4.3 Realtime — Socket.IO in-process

REST carries conversation lists, message history, request lists, conversation creation, reporting and pagination. Realtime carries new-message delivery, delivery acknowledgement, read receipts, unread counts and connection state.

Socket.IO is chosen over raw WebSocket because reconnection, acknowledgements and rooms are required by MSG-FR-004 and EDGE-021 and would otherwise be hand-built. A managed realtime service adds recurring cost and lock-in for a feature at trivial scale.

**Fallback:** if realtime is unavailable, the client degrades to polling the same REST history endpoint. **The polling path reuses the identical client-generated message UUID**, so a message cannot be duplicated by transport switching (EDGE-021). **ADR-009.**

### 4.4 Jobs — `pg-boss`, no Redis

Background work in V1: outbox dispatch, push fan-out, event reminders (EVENT-FR-008), suspension expiry (BR-034), account erasure at day 30 (PRIV-007), media quarantine validation, orphan sweeping, and announcement expiry.

All of it is low-volume and schedule-driven. `pg-boss` runs on the existing PostgreSQL instance with transactional enqueue — which matters, because the outbox must be written **in the same transaction** as the business change.

**Redis is not introduced.** Explicit triggers for adding it, any one of which is sufficient:
1. More than one API instance is run — Socket.IO then needs its adapter
2. Measured rate-limit contention on the database
3. Measured queue throughput contention

**ADR-010.**

---

## 5. Media delivery — evaluated, not assumed

> **Correction 7 applied.** The SRS mandates media storage and delivery, progressive loading, mandatory client-side compression and a 500 KB transmitted ceiling. **It does not mandate a separate CDN product.** This is an architecture decision.

| Option | Latency from Pakistan | Egress cost | Cacheability | Ops burden | Private/signed delivery | Verdict |
|---|---|---|---|---|---|---|
| **A · Direct from object storage** | Bounded by the bucket's region; no edge presence | Provider egress rate, every request | None beyond client cache | Lowest — one service | Presigned GET URLs | Workable |
| **B · Object storage behind a CDN** | Edge cached near or nearer the user after first fetch | Usually cheaper at volume; origin fetches reduced | High — media is immutable | One extra service and a cache-invalidation concern | Signed URLs or signed cookies at the edge | **Recommended** |
| **C · Managed image/media service** | Edge delivery plus on-the-fly transforms | Highest per-unit | High | Lowest engineering, highest lock-in | Provider-specific | Rejected for V1 |

**Analysis against this product:**

- Media is **immutable once promoted** — objects are written under a random name and never rewritten (SEC-015). That is the ideal CDN cache profile: near-100% hit rate after first fetch, and no invalidation problem.
- The audience is **nationwide Pakistan on slow, expensive mobile data** (D-03). There is no major cloud region inside Pakistan, so origin RTT is material for every image on every feed page.
- Images are capped at 500 KB and feed pages return 20 items — media is the dominant share of bytes, so egress economics dominate the hosting bill and RSK-013.
- Option C's transform capability is not needed: compression happens on-device (MEDIA-FR-001), and only one derived variant is required (feed thumbnail vs. full-size viewer, MEDIA-FR-002).

**Selected: Option B — object storage behind a CDN**, on the grounds of cache profile and egress economics rather than any requirement. **Option A is an acceptable V1 fallback** if a CDN cannot be provisioned in time; it changes a URL-generation function and nothing else. **This is deliberately a reversible decision.**

**Deferred to measurement:** whether signed URLs are needed for post media. All V1 profiles and posts are public to authenticated users (BR-VIS-001), so the media itself is not secret — but object names are unguessable (SEC-015) and message images must not be retrievable outside their conversation (MSG-FR-008). **Conversation media requires signed, short-lived URLs; post media does not.**

**ADR-012.**

---

## 6. What is deliberately not in the stack

| Excluded | Why | Would be reconsidered when |
|---|---|---|
| Kubernetes | No specialist; a managed PaaS meets 99% uptime (NFR-AVAIL-001) | Multi-region or multi-service orchestration is genuinely required |
| Kafka / any broker | `pg-boss` covers all V1 asynchronous work | Cross-service event streaming appears |
| Elasticsearch / OpenSearch | PostgreSQL FTS + trigram meets BR-042's best-effort standard | Measured search dissatisfaction, or corpus past ~10⁶ posts |
| Redis | No measured requirement in V1 | Any of the three triggers in §4.4 |
| Event sourcing / CQRS | Enormous complexity for a 1,000-user civic platform | Never, at this scale |
| Service mesh · microservices | Two developers | Team boundaries, not load, justify extraction |
| GraphQL | One client; complicates per-field authorization under SEC-011 | Multiple divergent clients |
| Separate video infrastructure | BR-VID-001 / BR-045 forbid video entirely | Phase 2 only |
| Third-party product analytics | PRIV-012 forbids individual profiling | Never, as specified |

---

## 7. Stack summary

```
Android (Kotlin · Jetpack Compose · API 26+)
        │  REST + Socket.IO over TLS
        ▼
NestJS modular monolith (TypeScript)  ──►  pg-boss workers (same codebase)
        │                                          │
        ├── PostgreSQL 18 (data · FTS · queue · sessions · audit)
        ├── S3-compatible object storage  ──►  CDN  (ADR-012)
        ├── FCM (push)
        └── SMS/OTP port  ── adapter ──►  provider TBD (DEP-002)

Next.js  ──►  Admin Portal (behind admin auth)
         └──►  App-Links interstitial + public policy pages (ARCH-CONFLICT-008)

Technical owner  ──►  CLI over an out-of-band channel  ──►  admin provisioning
                       (never an HTTP endpoint — S2-CR-005, SEC-021)
```

**Languages: two** — Kotlin for the Android client, TypeScript for backend, workers, admin, contracts and tokens.

---

## 8. Pinning checklist for EPIC-00

Every item below must be verified against official documentation and pinned before installation. **No version is invented here.**

- [ ] Kotlin · Android Gradle Plugin · Compose BOM · `compileSdk` / `targetSdk` (`minSdk = 26` is fixed by NFR-COMP-001)
- [ ] Node.js LTS · NestJS · Socket.IO · `pg-boss`
- [ ] PostgreSQL major version offered by the chosen managed host — determines whether `uuidv7()` is native or application-generated
- [ ] Next.js · React
- [ ] Argon2id parameters, benchmarked on the chosen host (SEC-001)
- [ ] Firebase Cloud Messaging SDK
- [ ] Urdu typeface licence permitting bundling (DEP-013 · LOCALE-FR-004)
