# Mohalla — محلہ

**Shehersaaz Community Platform** — a bilingual civic community platform for Pakistan.

> ## ⚠️ This repository contains NO product features.
>
> It is a **development environment foundation**. Authentication, posts, feed, events,
> messaging, moderation and every other product capability are **unstarted**.
> What exists is the scaffolding, the guard rails and the proof that the toolchain works.

---

## What this is

Mohalla is an Android-first platform where Pakistani citizens follow civic issues, discuss them, connect with organisations, and take part. Urdu and English are peers, with full right-to-left mirroring.

| | |
|---|---|
| **Android** | Kotlin + Jetpack Compose, API 26+ |
| **API** | NestJS modular monolith, TypeScript, 17 modules in three tiers |
| **Database** | PostgreSQL 18 |
| **Admin** | Next.js |
| **Realtime** | Socket.IO, in-process |
| **Jobs** | pg-boss — PostgreSQL-backed, no separate broker |

---

## Repository layout

```
apps/api        NestJS      — 2 health routes, 17 empty module shells
apps/worker     pg-boss     — one health job
apps/admin      Next.js     — one page proving build + RTL
apps/android    Kotlin      — one screen proving build + mirroring
packages/       tokens · localization · db · eslint rules
infrastructure/ Docker Compose (local), staging placeholders
scripts/        guards, smoke test, dev scripts
docs/           Stages 1–4 approved & frozen; Stage 5 foundation
```

---

## Getting started

**Requires:** Node 24.20.0 · JDK 21 · Android SDK 36 · Docker Desktop

```bash
npm ci
cp .env.example .env
npm run infra:up
npm run db:roles
npm run db:migrate
npm run build
```

Full instructions, including toolchain installation: **[DEVELOPMENT.md](DEVELOPMENT.md)**

> **Docker Desktop is not currently installable on the primary development workstation.**
> The cause is verified and documented in
> [`docs/foundation/09-local-development.md`](docs/foundation/09-local-development.md).
> Database-dependent steps are blocked locally; they run in CI on every push.

---

## The rules that are enforced by the build

These are not conventions. Each one **fails CI**.

| Guard | Command | Fails when |
|---|---|---|
| **Module direction** | `npm run guard:deps` | A module imports upward across a tier (admin → product → platform) |
| **Bilingual parity** | `npm run guard:locale` | An English string key has no Urdu counterpart, or an Urdu value is blank |
| **RTL** | `npm run lint` | Any physical CSS side — `marginLeft`, `left`, `textAlign: 'left'` |
| **Secrets** | `npm run guard:secrets` | A credential pattern appears in a tracked file |
| **Audit immutability** | CI `database` job | `runtime_app` can UPDATE or DELETE an `audit_log` row |

Run all the local ones: `npm run guard:all`

---

## Two things worth knowing before you write code

**Urdu is a peer, not a translation.** Every user-facing string needs `en` and `ur` from the start, and every layout must mirror. Use logical properties — `margin-inline-start`, `Alignment.Start` — never `left`/`right`. The lint rule will stop you, but understanding why is better than being stopped.

**The audit log cannot be changed by the application.** `runtime_app` has `INSERT` and `SELECT` and nothing else. If you find yourself wanting to update an audit row, the design is wrong — append a new one.

---

## Documentation

| | |
|---|---|
| **[docs/foundation/](docs/foundation/)** | Stage 5 — this foundation, 16 documents |
| **[docs/architecture/](docs/architecture/)** | Stage 4 — approved and frozen. 19 documents, 22 ADRs, 13 diagrams |
| `docs/srs-mvp-v1.html` | Stage 2 — 124 functional requirements |
| `docs/uiux-spec-v1.html` | Stage 3 — 70 screens |
| `docs/prototype.html` | Stage 3 — clickable prototype |

**Stage 1–4 documents are approved historical records and must not be edited.** Corrections are recorded in Stage 5 documents.

---

## Status

| | |
|---|---|
| Stage 1 Product Scope | ✅ Approved |
| Stage 2 SRS | ✅ Approved — 124 FRs |
| Stage 3 UI/UX + Prototype | ✅ Approved |
| Stage 4 Technical Architecture | ✅ **Approved and frozen** |
| Stage 5 Project Foundation | 🔄 **In progress** — see [`docs/foundation/15-stage-5-validation.md`](docs/foundation/15-stage-5-validation.md) |

**Private repository.** Not licensed for redistribution.
