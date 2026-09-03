# ⚠️ REQUIRED — Public Repository Publication Authorization

**Status: NOT APPROVED — this is a request, not an approval.**
Raised 3 September 2026 per Stage 6 addendum §2.

---

## Why this document exists

**`waqaskhan0/mohalla` is already PUBLIC.** It was made public on the **individual repository
owner's explicit instruction**, recorded in
[`../foundation/01-github-repository.md`](../foundation/01-github-repository.md) §1.

**No record exists showing that Shehersaaz — as an organisation — approved publishing this
material.** An individual owner's decision is not an organizational authorization.

The addendum is explicit: *"Do not invent or self-approve organizational authorization."* So
this document **requests** it. It must be completed and approved by someone with authority to
speak for Shehersaaz.

**The exposure audit found no confidential or clearly-internal material**
([`../security/public-repository-audit.md`](../security/public-repository-audit.md) §4), so per
§2 local implementation and further pushes may continue. This remains an **open governance
item**, not a blocker.

---

## To be completed by Shehersaaz

| Field | Value |
|---|---|
| **Organization / project owner** | *(to be completed)* |
| **Approver name or role** | *(to be completed)* |
| **Approval date** | *(to be completed)* |

### Material approved for publication

Tick what Shehersaaz authorises to be world-readable. **All of it is currently public.**

- [ ] Source code (API, worker, admin console, Android app, shared packages)
- [ ] Product requirements — `docs/product-scope-v1.html`, `docs/srs-mvp-v1.html` (124 FRs)
- [ ] Architecture documents — `docs/architecture/` (19 documents, 22 ADRs, 13 diagrams)
- [ ] Database design — ERD, schema, migrations, the four-role privilege model
- [ ] API contracts — `docs/architecture/contracts/openapi-v1.yaml`
- [ ] **Security design** — ban-list structure, audit-privilege model, anti-enumeration behaviour, media quarantine
- [ ] UI/UX documents — `docs/uiux-spec-v1.html` (70 screens, design tokens)
- [ ] Clickable prototype — `docs/prototype.html`
- [ ] Future implementation work (Stage 6 backend onward)

### Material EXCLUDED from publication

*(List anything that must never be published. Nothing is currently withheld.)*

| Item | Reason |
|---|---|
| | |

### Decisions required

| Decision | Options | Chosen |
|---|---|---|
| **Licensing** | Proprietary / public-source · open-source (named licence) · dual — see [`LICENSE-DECISION-REQUIRED.md`](LICENSE-DECISION-REQUIRED.md) | |
| **Contribution policy** | No external contributions · issues only · PRs under a CLA/DCO · open | |
| **Security-reporting contact** | GitHub private vulnerability reporting (**enabled**) · a named non-personal address | |
| **Right to publish Shehersaaz branding and documentation** | Approved / not approved / approved with conditions | |

---

## Risk the approver is accepting

The published material includes the **security design** of a platform intended to hold
Pakistani citizens' phone numbers, private messages and safety reports: the ban-list structure,
the audit-privilege model, the anti-enumeration behaviour and every rate limit.

Stage 4 §3 of the GitHub proposal argued against this: *"Publishing that before launch hands an
attacker the design."* The architecture is built so that it remains secure while readable —
but the approver should record that they accept this trade-off knowingly.

**Public exposure is effectively permanent.** Clones, forks, search-engine caches and archives
persist after any later re-privatising.

## On approval

1. Replace this file with `PUBLIC-REPOSITORY-AUTHORIZATION.md` containing the completed record.
2. Reference it in the implementation baseline and in
   [`../security/public-repository-audit.md`](../security/public-repository-audit.md) §6.
3. Apply any exclusions — if material must be withdrawn, raise it **before** further pushes,
   and note that removal from `HEAD` does not remove it from history.
