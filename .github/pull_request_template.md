## What and why

<!-- What changes, and which requirement or epic it serves. Link the SRS/FR ID. -->

**Requirement / epic:**

---

## Checks

- [ ] `npm run guard:all` passes locally
- [ ] `npm run lint` passes — including the RTL gate
- [ ] `npm run build` passes
- [ ] Tests added or updated for the behaviour changed

## Architecture

- [ ] No module imports upward across a tier (admin → product → platform)
- [ ] No business rule added to a controller
- [ ] Transaction boundaries are in application services, not repositories or controllers
- [ ] Any admin action emits audit **inside the same transaction**

## Bilingual and RTL

- [ ] Every new user-facing string has **both** `en` and `ur` entries
- [ ] Layout uses logical properties only — no `left`/`right`, no `marginLeft`, no `textAlign: 'left'`
- [ ] Checked in **both** directions if the change touches layout

## Privacy and security

- [ ] No phone, email, date of birth or password hash added to a public projection
- [ ] No identifier written into `audit_log.metadata`
- [ ] No secret, key or credential added to any tracked file
- [ ] Read paths that return user content compose the block predicate

## Anything reviewers should know

<!-- Trade-offs, follow-ups, deliberate omissions. Say what you did NOT do. -->
