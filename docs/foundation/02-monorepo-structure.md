# 02 — Monorepo Structure

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Authority: Stage 4 **ADR-015** (monorepo) · **ADR-005** (modular monolith)

---

## 1. Layout

```
D:\App\
├── apps/
│   ├── api/         NestJS      — 2 health routes, 17 empty module shells
│   ├── worker/      pg-boss     — FOUNDATION_HEALTH_JOB only
│   ├── admin/       Next.js     — one page, proves build + RTL
│   └── android/     Kotlin      — one screen, proves build + mirroring
├── packages/
│   ├── contracts/         shared API types (generated from OpenAPI later)
│   ├── tokens/            design tokens, GENERATED from the approved prototype
│   ├── localization/      en/ur catalogues; parity enforced in CI
│   ├── db/                roles, migrations, audit foundation
│   └── eslint-plugin-mohalla/   the RTL lint rule
├── infrastructure/
│   ├── docker/            local PostgreSQL
│   ├── staging/           DEFERRED — Stage 5B
│   └── production/        not provisioned
├── scripts/
│   ├── posix/             guards, smoke test, dev scripts
│   └── windows/           PowerShell equivalents
├── docs/
│   ├── product-scope-v1.html    Stage 1 — approved, frozen
│   ├── srs-mvp-v1.html          Stage 2 — approved, frozen
│   ├── uiux-spec-v1.html        Stage 3 — approved, frozen
│   ├── prototype.html           Stage 3 — approved, frozen
│   ├── architecture/            Stage 4 — approved, frozen (59 files)
│   └── foundation/              Stage 5 — this set
└── .github/                     CI, CODEOWNERS, templates
```

---

## 2. Workspace manager — npm workspaces

**FOUNDATION-CONFLICT-001 resolved: npm workspaces, not pnpm.**

ADR-015's *Decision* is "monorepo". `pnpm` appears in its supporting prose, not in the Decision. Stage 4 §7 asks for "a lightweight workspace approach suitable for two developers". npm workspaces delivers that with one fewer tool to install, pin and secure.

**Verified working:** `npm install` links all seven workspace packages into `node_modules/@mohalla/`, so cross-package imports resolve through ordinary Node resolution. **No TypeScript `paths` aliases are needed, and none are configured** — one less thing to keep in sync.

Migration to pnpm later requires no structural change: same layout, one lockfile swap.

---

## 3. The 17 backend module shells

> ### ⚠️ FOUNDATION-CONFLICT-003 — the module count is 15 in prose, 17 in fact
>
> Stage 4 states **"15 modules"** in four places — `01-technical-architecture.md` (twice), `STAGE-4-APPROVAL.md`, and `ADR-005`. But `06-backend-modules.md` **enumerates seventeen**, §4.1 through §4.17, each with its own owned entities, services, events and tests.
>
> **The enumeration is the substance; "15" is a summary arithmetic error.** The Stage 5 brief inherited the wrong figure.
>
> **Resolution: 17 module shells are created**, matching the enumerated specifications. Dropping two modules to match a headline count would delete real architecture.
>
> The frozen Stage 4 documents are **not modified** — the correction is recorded here, per the standing instruction that approved artefacts are historical records.

| Tier | Modules | Count |
|---|---|---|
| **Platform** | `identity` · `localization` · `media` · `audit` · `notifications` | 5 |
| **Product** | `profile` · `social-graph` · `safety` · `posts` · `engagement` · `feed` · `events` · `messaging` · `search` · `settings` | 10 |
| **Admin** | `moderation` · `admin-ops` | 2 |
| | | **17** |

Every shell is an empty `@Module({})` with a comment naming what it will own. **No controller, provider, entity or route exists in any of them.**

---

## 4. Dependency direction — enforced, not documented

```
Admin  ──►  Product  ──►  Platform  ──►  (nothing)
```

`apps/api/src/modules/modules.registry.ts` is the machine-readable tier declaration. `scripts/posix/check-module-dependencies.mjs` reads it and **fails the build** on:

- any relative import that crosses a tier boundary **upward**
- any module directory **not listed** in the registry
- any registered module with **no directory**

**Verified by negative test, not by inspection:**

| Injected violation | Result |
|---|---|
| `platform/identity` imports `product/posts` | ❌ **Build failed** — exit 1, named the file and both tiers |
| Unregistered directory `product/__ghost` | ❌ **Build failed** — exit 1 |
| Both removed | ✅ Passes — "17 modules … dependency direction clean" |

A guard that has never been seen to fail is not evidence of anything. These have been seen to fail.

---

## 5. Deliberate omissions

| Not present | Why |
|---|---|
| `packages/contracts` populated | Generated from `openapi-v1.yaml` when the first real endpoint exists. An empty directory is honest; a hand-written duplicate would drift |
| Turborepo / Nx | Stage 4 forbids orchestration platforms without demonstrated need. Two developers, four apps |
| Shared UI component package | The admin console and Android app share no rendering technology. A package spanning them would be a folder, not an abstraction |
| Docker images for the apps | Local development runs them on the host, so debuggers and file watchers work normally |
