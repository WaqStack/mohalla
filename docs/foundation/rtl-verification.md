# RTL / LTR Verification

**Stage 5 · Project Foundation · Shehersaaz Community Platform (Mohalla — محلہ)**
Status: **STATIC VERIFIED** · **DEVICE EXECUTION NOT VERIFIED** · 2 September 2026

---

## 1. The distinction this document keeps

RTL correctness has two halves, and conflating them is how "we support Urdu" becomes a
bug report from a real user:

| | What it proves | Status here |
|---|---|---|
| **STATIC VERIFIED** | The code cannot express a non-mirroring layout — physical CSS sides fail the build, every string exists in both languages, and the manifest declares mirroring | ✅ **Done and enforced** |
| **DEVICE EXECUTION NOT VERIFIED** | A human looked at a rendered Urdu screen on a real device and confirmed it mirrors, the fonts render, and touch targets are reachable | ⏳ **Not done — blocked** |

**The gate as a whole is NOT "PASS".** Static verification is complete; device execution
has not happened, and this document does not pretend otherwise.

---

## 2. English is LTR, Urdu is RTL — where that is decided

There is exactly one decision point per surface, so direction can never be set
inconsistently across a screen.

| Surface | Direction source |
|---|---|
| **Admin** | `apps/admin/lib/locale.ts` → `directionFor(locale)`; applied once as `dir` on `<html>` in `layout.tsx` |
| **Android** | The device/app locale; `android:supportsRtl="true"` in the manifest makes every `start`/`end` attribute mirror |

Neither surface branches on locale to pick a side anywhere else. Both use **logical**
properties and let the single `dir`/locale drive mirroring.

---

## 3. STATIC VERIFICATION — what is enforced, and proven by negative test

### 3.1 No physical CSS sides (admin)

`packages/eslint-plugin-mohalla/rules/no-physical-properties.js`, wired at **`error`**.

Covers 16 physical properties plus `textAlign: 'left' | 'right'`. Each message cites
LOCALE-FR-003 / BR-041 / REL-002.

**Proven by negative test** — a `.tsx` file with an interface, `satisfies`, JSX and a
nested object spread:

| Probe | Result |
|---|---|
| `marginLeft`, `textAlign: 'right'`, `paddingLeft` in a spread | ❌ 3 errors, build fails |
| `marginInlineStart`, `textAlign: 'start'`, `paddingInlineStart` | ✅ passes |

A rule that has never failed proves nothing. This one has been made to fail and then pass.

### 3.2 Bilingual string parity (both surfaces)

- **Admin / API:** `scripts/posix/check-locale-parity.mjs` fails the build when an English
  key has no Urdu counterpart or an Urdu value is blank. Proven by deleting a key (build
  failed) and blanking a value (build failed).
- **Android:** `LocalizationParityTest` asserts the same across `values/` and `values-ur/`
  **and** asserts the manifest declares `supportsRtl`. Proven by deleting an Urdu string
  and by setting `supportsRtl="false"` — both failed the build **after** the test's Gradle
  inputs were declared (see §5).

### 3.3 Logical spacing, directional structure

- Admin `.card` uses `border-inline-start`, so its accent bar moves to the right edge in
  Urdu with no direction-specific CSS.
- Android `FoundationScreen` uses `Modifier.padding(horizontal = …)`, `Alignment.Start`,
  and displays its own resolved `LayoutDirection` (LTR/RTL) so a tester can *see* it.
- Dual line-height: `--line-height-latin: 1.5`, `--line-height-urdu: 1.85`, switched by
  `html[dir='rtl']` — Urdu Naskh needs more leading than Latin at the same size.

### 3.4 Touch targets

- Android: Material 3 components meet the 48dp minimum; the foundation screen adds no
  smaller control.
- Admin: the one interactive control (`Re-check` button) sets `min-block-size: 44px`.

**Not yet verified:** every *future* interactive control. There is almost no interactive
surface in the foundation, so this is a rule to hold to, not yet a large audit.

---

## 4. DEVICE EXECUTION — what has NOT been done, and why

| Not verified | Blocked by |
|---|---|
| Urdu screen mirrors on a real device | No emulator (no hypervisor) and no physical device (`adb devices` = 0) |
| Naskh / Nastaliq render; Urdu font fallback is correct | Same — and font rendering **differs** between emulator images and real Pakistani-market handsets, so the emulator is not even a full substitute |
| Directional icons (back/forward, chevrons) flip | Same |
| Mixed Urdu + Latin + digits render in the right order | Same |
| Navigation order mirrors | Same — there is also no navigation in the foundation yet |

The Android emulator needs WHPX/Hyper-V acceleration, which is blocked by the same missing
Windows features as Docker — see [`WINDOWS-ADMIN-SETUP.md`](WINDOWS-ADMIN-SETUP.md). A
**physical device over `adb`** is the better test regardless.

---

## 5. A real defect this verification caught

The Android localization/RTL test initially **passed while not running at all**: deleting
an Urdu string and disabling `supportsRtl` still produced a green build.

The tests were correct — Gradle marked `testDebugUnitTest` UP-TO-DATE because the test
reads resource files through relative paths Gradle could not see as inputs. Fixed by
declaring `values*/strings.xml` and `AndroidManifest.xml` as task inputs; both faults then
failed the build with no `--rerun-tasks`.

This is recorded here because it is the clearest evidence that **static verification only
counts when the check is proven to fail** — a green build from a check that never ran is
worse than no check.

---

## 6. Verdict

| | |
|---|---|
| Static verification | ✅ **VERIFIED** — enforced at build time, proven by negative test on both surfaces |
| Device execution | ⏳ **NOT VERIFIED** — no device or emulator available |
| **Gate overall** | **NOT PASS.** Static half complete; device half outstanding |

The gate reaches PASS when an Urdu screen has been rendered and confirmed on a real device
or a working emulator — not before.
