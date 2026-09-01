# 07 — Admin Console Foundation

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Next.js **16.3.4** · React **19.2.8** (ADR-003) · Status: **builds clean**

---

## 1. What exists

One page. It proves the application compiles, renders, and mirrors.

```
apps/admin/
├── next.config.mjs
├── app/
│   ├── layout.tsx      sets lang + dir on <html> from the active locale
│   ├── page.tsx        foundation landing page
│   └── globals.css     logical properties only
└── lib/locale.ts       the single place direction is decided
```

**No moderation queue. No user management. No report review. No login.** Those are built from UI/UX §27 and SRS §10.14 in their own epics.

> **Relevant Stage 4 finding (ARCH-CONFLICT-009):** the approved prototype contains **zero admin screens**. The admin console has no prototype to work from and is built from the written specification. That is a known gap carried forward, not something the foundation resolves.

---

## 2. RTL — one attribute, whole-interface mirroring

`app/layout.tsx` sets `dir` on `<html>` from the active locale. `lib/locale.ts` is **the only place direction is decided**:

```ts
export function directionFor(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ur' ? 'rtl' : 'ltr';
}
```

Components never branch on locale to pick a side. They use **logical properties**, and the whole interface mirrors from that one attribute.

`globals.css` states the rule at the top of the file:

| Use | Never |
|---|---|
| `margin-inline-start` | `margin-left` |
| `padding-inline-end` | `padding-right` |
| `inset-inline-start` | `left` |
| `border-inline-start` | `border-left` |
| `text-align: start` | `text-align: left` |

The `.card` accent bar uses `border-inline-start`, so it moves to the right edge in Urdu with no direction-specific CSS. That is the demonstration, not just the claim.

---

## 3. Dual line-height

Urdu Naskh needs more leading than Latin at the same size:

```css
:root { --line-height-latin: 1.5; --line-height-urdu: 1.85; }
html[dir='rtl'] body { line-height: var(--line-height-urdu); }
```

A single shared line-height makes Urdu look cramped and English look loose. The Stage 3 type scale carries a line-height per direction, and the foundation carries the same shape.

---

## 4. The RTL lint gate — verified in both directions

`packages/eslint-plugin-mohalla/rules/no-physical-properties.js`, set to **`error`**, not `warn`.

**Why an error.** A physical property does not mirror. One forgotten `marginLeft` produces an interface that is *almost* mirrored — harder to spot in review, and worse for the user, than one that is obviously broken. A warning gets scrolled past under delivery pressure; OD-011 guarantees that pressure exists.

The rule covers 16 physical properties plus `textAlign: 'left' | 'right'`, and each message cites the requirement:

```
'marginLeft' does not mirror in RTL. Use 'marginInlineStart'.
Required by LOCALE-FR-003 / BR-041 / REL-002.
```

**Verified against real TypeScript** — a `.tsx` file with an interface, a type annotation, `satisfies`, JSX and a nested object spread:

| Probe | Result |
|---|---|
| `marginLeft`, `textAlign: 'right'`, `paddingLeft` inside a spread | ❌ **3 errors, exit 1** |
| `marginInlineStart`, `textAlign: 'start'`, `paddingInlineStart` | ✅ **exit 0** |

---

## 5. Why TypeScript is 6.0.3 and not 7.0.2

**FOUNDATION-CONFLICT-004.** TypeScript **7.0.2** is the current stable `latest`. But `typescript-eslint@8.69.0` — the only mature TypeScript lint path — declares `typescript >=4.8.4 <6.1.0`.

With TypeScript 7 there is **no TypeScript parser for ESLint**, so every `.ts`/`.tsx` file is a parse error and **the RTL gate silently stops running over the admin console entirely**.

Losing the RTL build gate is not an acceptable price for a newer compiler, given LOCALE-FR-003/BR-041/REL-002 and OD-011's explicit ban on skipping RTL. **TypeScript is pinned to 6.0.3.** Revisited when typescript-eslint supports TS 7.

---

## 6. Verified

| Check | Result |
|---|---|
| `npm run build --workspace @mohalla/admin` | ✅ **exit 0** — compiled in 24.6s, 2 static routes |
| TypeScript check (Next.js built-in) | ✅ passed |
| `npx eslint .` | ✅ **0 errors** |
| RTL gate rejects physical properties | ✅ verified |
| RTL gate accepts logical properties | ✅ verified |
| Visual RTL check in a browser | ⏳ **not performed** — the page renders in a build, but no browser verification of the mirrored layout has been done |
