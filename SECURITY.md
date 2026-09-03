# Security Policy

**Mohalla — Shehersaaz Community Platform** · `waqaskhan0/mohalla`

This repository is **public**. Its source, architecture, database design and security
controls are readable by anyone. That is deliberate: the platform's security must not depend
on the implementation being secret. See
[`docs/security/public-repository-policy.md`](docs/security/public-repository-policy.md).

---

## Supported versions

The platform is **pre-release**. No version is deployed to production and no user data
exists yet.

| Version | Supported |
|---|---|
| `main` (unreleased) | ✅ Security reports accepted |
| Tagged releases | none yet |

---

## Reporting a vulnerability

**Please report privately. Do not open a public issue for an undisclosed vulnerability.**

**Preferred route — GitHub private vulnerability reporting:**
open the repository's **Security** tab → **Report a vulnerability**. This is enabled on this
repository and creates a private advisory visible only to the maintainers and you.

If private reporting is unavailable to you, contact the Shehersaaz project through the
organisation's published contact channel and state that the message concerns a security
vulnerability in the `mohalla` repository. **Do not include exploit details in a public
message** — ask for a private channel first.

> No personal mobile number is published here by policy. Routing is through GitHub private
> reporting or the organisation's official channel.

### What to include

- The affected component (API module, admin console, Android app, database, CI workflow)
- The version or commit SHA
- A description of the issue and why it is a security problem
- Reproduction steps, ideally minimal
- The impact you believe it has (data exposure, privilege escalation, denial of service…)
- Any suggested remediation

**Do not include real personal data in a report.** If a reproduction requires a phone
number, email address or message content, use synthetic values and say so. If you believe you
have found real user data exposed, say that it exists and where — **do not paste it**.

### What to expect

| Stage | Target |
|---|---|
| Acknowledgement that the report was received | within **5 working days** |
| Initial assessment (valid / not / needs more information) | within **10 working days** |
| Remediation plan for a confirmed issue | communicated with the assessment |

These are targets for a small pre-launch team, not a contractual SLA.

### Coordinated disclosure

We will work with you on a disclosure timeline. Please give us a reasonable opportunity to
fix a confirmed issue before publishing details. We will credit reporters who wish to be
credited. We will not pursue action against good-faith research that:

- stays within this repository and your own test instances,
- does not access, modify or exfiltrate other people's data,
- does not degrade the service for others, and
- reports privately first.

---

## Out of scope

- Findings that depend on the source being secret (endpoint paths, table names, algorithms).
  The system is designed to be secure while readable.
- Missing hardening on **local development** configuration (the Docker Compose PostgreSQL
  password is a documented local-only value and is not a credential for any deployed system).
- Reports generated solely by an automated scanner with no demonstrated impact.
- Absence of a feature not yet implemented — the backend is under construction.
