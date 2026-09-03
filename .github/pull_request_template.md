## What and why

<!-- What changes, and which requirement or epic it serves. Link the SRS/FR ID. -->

**Requirement / epic:**

---

> ## ⚠️ PUBLIC REPOSITORY
> This diff, its description, its comments and its CI logs are **world-readable and
> permanent**. Nothing here may contain credentials, personal data or private content.

## Public-repository safety — required

- [ ] **No secrets included** — no keys, tokens, passwords or credentials, in code, tests, fixtures, comments or commit messages
- [ ] **No personal data included** — no real mobile numbers, emails, dates of birth, messages or reports
- [ ] **Fixtures are synthetic** and *visibly fictional* (a realistic-looking phone number is a defect — see audit finding PD-001)
- [ ] **Workflow permissions reviewed** — least privilege; no job gained write access without a stated reason
- [ ] **No privileged workflow executes fork code** — no `pull_request_target` checking out PR head, no privileged `workflow_run`/`issue_comment`
- [ ] **No sensitive CI artifacts produced** — no `.env`, dumps, keys, keystores, signed release builds or unredacted logs
- [ ] **Logs are redacted** — no passwords, OTPs, tokens, headers, phone numbers, emails or message content
- [ ] **Dependency changes reviewed** per [`dependency-review-policy.md`](../docs/security/dependency-review-policy.md) — lockfile committed, no unreviewed major bump
- [ ] **Public documentation is safe to publish** — no internal hostnames, IPs, admin usernames or emergency access methods

## Checks

- [ ] `npm run verify` passes locally — record the result
- [ ] Tests added or updated for the behaviour changed
- [ ] **Security requirements tested** (authorization, blocking, enumeration resistance, session revocation, audit immutability — whichever apply)
- [ ] **Privacy requirements tested** (redaction, projection, anonymisation — whichever apply)

## Architecture

- [ ] No module imports upward across a tier (admin → product → platform)
- [ ] No business rule added to a controller
- [ ] Transaction boundaries are in application services
- [ ] Any admin action emits audit **inside the same transaction**

## Bilingual and RTL

- [ ] Every new user-facing string has **both** `en` and `ur` entries
- [ ] Layout uses logical properties only — no `left`/`right`, no `marginLeft`, no `textAlign: 'left'`
- [ ] Checked in **both** directions if the change touches layout

## Anything reviewers should know

<!-- Trade-offs, follow-ups, deliberate omissions. Say what you did NOT do.
     Do not include confidential internal information. -->
