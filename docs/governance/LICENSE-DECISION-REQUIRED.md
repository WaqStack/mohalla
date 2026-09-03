# ⚠️ REQUIRED — Licensing Decision

**Status: NO LICENCE FILE EXISTS. NO DECISION RECORDED.**
Raised 3 September 2026 per Stage 6 addendum §18.

---

## The situation

The repository is **public** and has **no `LICENSE` file**.

Under copyright law, public-but-unlicensed source is **"all rights reserved"** by default:
anyone may view it, but **no one is granted permission to use, copy, modify or distribute it**.
That may be exactly what Shehersaaz wants — or not. **It is currently an accident of omission
rather than a decision.**

Per the addendum: *"Do not add an open-source license without explicit authorization from the
repository owner and Shehersaaz"* and *"Do not choose automatically."* **No licence has been
added.**

---

## Options

| Option | What it means | Consider when |
|---|---|---|
| **A — Proprietary / public-source** *(current de-facto state)* | Readable, but all rights reserved. No reuse, no redistribution, no derivative works. | Shehersaaz wants transparency and auditability without giving away reuse rights. **This is the status quo; choosing it explicitly just documents reality.** |
| **B — Permissive open source** (MIT, Apache-2.0) | Anyone may use, modify and redistribute, including commercially. Apache-2.0 adds an explicit patent grant and requires change notices. | You want reuse and contribution by other civic-tech projects. |
| **C — Copyleft** (AGPL-3.0, GPL-3.0) | Derivatives must remain under the same licence. **AGPL** also covers use over a network, so a hosted fork must publish its source. | You want other civic platforms built on this to stay open. |
| **D — Dual licensing** | Open licence for community use plus a commercial licence. | Shehersaaz may later want commercial terms. |

**No recommendation is made here** — this is a legal and organisational decision, not a
technical one.

## Coupled decision: contributions

Until a licence **and** a contribution policy are approved, **do not accept external feature
contributions.** Without them, an outside PR creates ownership and licensing ambiguity that is
awkward to unwind after merge.

`CONTRIBUTING.md` is deliberately limited to the approved internal process and does not invite
external contributions.

If contributions are later accepted, decide between a **DCO** sign-off (lightweight) and a
**CLA** (stronger, assigns or licenses rights to Shehersaaz).

## What must not happen

- ❌ Adding a licence file without explicit authorization
- ❌ Assuming "public" implies "open source"
- ❌ Merging an external feature PR before the licence and contribution policy are approved

## On decision

1. Record the choice here (or replace this file with `LICENSE-DECISION.md`).
2. Add the `LICENSE` file **only** if an open or dual licence was chosen.
3. Update `README.md` and `CONTRIBUTING.md` to match.
4. If proprietary, state it plainly in `README.md` so readers know the terms.
