# ADR-021 — V1 identity: verified Pakistani mobile number, mandatory

**Status:** Accepted — **approved by the product owner, 1 September 2026**
**Supersedes:** the open position in ADR-007 §context and `00` ARCH-CONFLICT-007
**Drivers:** D-04, D-05, D-16 · resolves OD-021

## Context

ARCH-CONFLICT-007 found that AUTH-FR-004 (email registration, a **Should**) undermined two **Must** rules: BR-036 could not bind a ban to an account with no phone, and the Pakistan-only registration restriction was unenforceable on that path.

Stage 4 initially leaned toward generalising BR-036 to "the verified primary identifier" (Option B). **The product owner correctly rejected that as insufficient**: blocking an email stops that email being reused, but does not stop the same person returning with a different phone number, and vice versa. Ban durability depends on **what identity every account is required to hold**, not on how the ban list is keyed.

## Decision — Option C

**Every normal V1 user account must possess a verified Pakistani mobile number.** Phone + SMS OTP is the required registration and identity mechanism.

| | |
|---|---|
| Primary identifier | **Phone, always** |
| Email | Optional **secondary** recovery/contact information only |
| Email-primary registration | **Removed from V1** — AUTH-FR-004 is removed as an approved product change |
| BR-036 | **Unchanged.** A banned account's registered mobile number cannot create a new account |
| Anti-enumeration | **Preserved unchanged** (SEC-006) |

## Why Option C rather than B

Option B keeps the Should and the RSK-007 mitigation, but leaves ban durability depending on which identifier an account happens to use — a weaker guarantee that is harder to reason about and harder to test. Option C makes the ban bind to an identity **every account is required to hold**, which is the only arrangement where BR-036 means the same thing for every user.

The cost is real and accepted: **email registration was the SRS's stated partial mitigation for SMS-delivery risk (RSK-007)**. That mitigation is given up. RSK-007 is now carried entirely by provider selection, sandbox testing and network-coverage validation before launch.

## Implementation

- `users.identity_type` is **removed** — redundant once phone is always primary
- `user_identifiers` remains polymorphic: `kind ∈ {PHONE, EMAIL}`, `is_primary boolean`
- **`CHECK (NOT is_primary OR kind = 'PHONE')`** — the single V1 restriction
- Every account must have exactly one `is_primary` row, so an account without a verified phone cannot exist
- `banned_identifiers` keys on the phone hash; the swappable `BanEnforcementPolicy` abstraction is **no longer needed** and is removed
- `AUTH-API-012 POST /auth/register/email` is **removed** from the inventory and the OpenAPI contract
- The email adapter (DEP-001) is required only if secondary email is implemented

## Extensibility — deliberate and cheap

**A future version admits another identity method by relaxing one `CHECK` constraint.** The polymorphic table, the `is_primary` flag and the hash-based ban list all survive unchanged. This was the point of keeping the model polymorphic even after choosing a phone-only policy.

## Benefits
BR-036 binds to an identity every account holds · one registration path to build, test and reason about · Pakistan-only restriction becomes structural · **~4 days removed from EPIC-02**.

## Disadvantages
**Loses the RSK-007 SMS mitigation** · a user without a working Pakistani number cannot register · diaspora access is deferred with iOS.

## Security impact
Positive. One authentication path is a smaller attack surface, and ban enforcement is unambiguous.

## Privacy impact
Neutral. The same personal data is collected; phone was already mandatory in practice.

## Operational impact
SMS becomes the **sole** onboarding dependency, which raises DEP-002's importance. **Network coverage must be tested on all major Pakistani networks before launch** — now a release-blocking check rather than a precaution.

## Cost impact
Slightly higher SMS spend, since there is no email fallback for registration.

## Revisit trigger
A future version adding an identity method — one constraint, no migration.
