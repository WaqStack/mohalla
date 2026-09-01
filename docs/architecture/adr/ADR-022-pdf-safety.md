# ADR-022 — PDF attachment: conditional, behind a Technical Lead gate

**Status:** Accepted — **approved by the product owner, 1 September 2026**
**Supersedes:** the "magic-byte only" position previously recorded in ADR-013, which was **not approved**
**Drivers:** SEC-013 · resolves revised OD-023

## Context

Stage 4 originally proposed accepting magic-byte verification alone for PDFs, with no malware or active-content detection, on the grounds that the app never renders PDFs itself.

**The product owner rejected this**, and the reasoning is correct: 🟦 **SEC-013 requires executable content to be rejected from every upload path.** A file is not safe merely because it begins with a valid PDF signature. **A Should feature may not weaken a Must security requirement.**

## Decision

**PDF attachment is a CONDITIONAL Should.** It ships only if a practical safe inspection mechanism is implemented and approved.

### Required pipeline

```
upload → PRIVATE quarantine → type/content inspection
       → PDF STRUCTURAL VALIDATION + ACTIVE-CONTENT REJECTION
       → READY | REJECTED → delivery under a random key
```

### Minimum bar — all mandatory

1. **Verify actual PDF structure**, not the extension or signature alone — parse and confirm well-formedness
2. **Reject malformed files** — a parser failure is a rejection, never a pass-through
3. **Reject detectable embedded executable or active content** — JavaScript actions, launch actions, embedded executables
4. **Quarantine objects never exposed** — no public URL, never CDN-fronted
5. **Final object keys randomised** (SEC-015)
6. **10 MB enforced server-side**, re-measured from the stored object
7. **Documents open in the device viewer** (MEDIA-FR-004) — the app never renders arbitrary PDFs

### Production gate

**Before PDF is enabled in production, the Technical Lead must approve the selected inspection/sanitisation capability.** Evaluated during EPIC-06 and recorded here.

### If no practical safe mechanism fits V1

**CUT PDF ATTACHMENT FROM V1.**

POST-FR-005, MEDIA-FR-003 and MEDIA-FR-004 are **Should**, so removal does not block the core MVP. **SEC-013 is not weakened to preserve a Should feature.** This is settled now, so it cannot be re-argued under schedule pressure during implementation.

Images (JPEG, PNG, WebP) are unaffected and remain **Must**.

## Why the original proposal was wrong

It treated "the platform is not the execution surface" as sufficient. But SEC-013 is about **what the platform accepts and distributes**, not only about what it executes. A malicious PDF served from Shehersaaz to a citizen's device is a harm the platform enabled, regardless of which process opened it. The requirement says *reject executable content in every upload path*, and "we don't run it" is not rejection.

## Benefits
SEC-013 is honoured without exception · the decision is made now rather than under delivery pressure · a clean cut path exists.

## Disadvantages
Adds ~2 days to EPIC-06 · introduces a parsing dependency whose own vulnerability history must be tracked · may result in PDF being cut, weakening the "awareness material" proposition.

## Security impact
Strongly positive — closes the gap the earlier proposal would have shipped.

## Privacy impact
None.

## Operational impact
A parsing library to keep patched. **A vulnerability in the parser is a supply-chain risk on the upload path** and is added to dependency monitoring.

## Cost impact
Negligible if a library suffices; a third-party scanning service would be a recurring cost and a separate decision.

## Revisit trigger
Technical Lead evaluation during EPIC-06 determines ship-or-cut.
