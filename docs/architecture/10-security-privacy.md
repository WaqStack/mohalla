# 10 — Security & Privacy Architecture

**Stage 4 · Shehersaaz Community Platform** · Version 1.1 · Status: **Complete**
**Diagram:** `diagrams/trust-boundaries.mmd`

> 🟦 **REQUIREMENT** approved · 🟩 **ARCHITECTURE** decision · 🟨 **PROPOSED DEFAULT** changeable · 🟥 **PROPOSED PRODUCT CHANGE** not approved

> **This architecture does not make the system secure.** It maps every SEC and PRIV requirement to a concrete control. Meeting them is necessary and not sufficient. 🟦 **RSK-009 records — and this document repeats — that an independent security review is recommended before public launch.**

---

## 1. Threat model

| Threat | Asset | Attack | Control | Requirement | Residual |
|---|---|---|---|---|---|
| **IDOR** | Any resource | Substitute another user's id | Object-level check on **every** request; shared guard; UUIDv7 is defence in depth only, **never the control** | SEC-011, SEC-019 | Low — **covered by mandatory test A** |
| **Account enumeration** | Phone numbers | Compare responses/timing across login, register, reset | Uniform body **and** timing; hash computed even for unknown accounts | SEC-006 | Low |
| **OTP abuse** | SMS budget, accounts | Flood requests; brute-force codes | 5 attempts → 15-min lockout; 60 s cooldown; 3/hour; hashed, single-use | SEC-003, SEC-005 | Low. **Cost risk remains — RSK-007** |
| **Credential stuffing** | Accounts | Replay breached pairs | 10 failures/15 min → 30-min lockout; Argon2id | SEC-007, SEC-001 | Medium — 🟥 2FA is out of scope |
| **Token theft** | Sessions | Steal a bearer token | Hashed at rest; TLS only; Keystore; revocable instantly | SEC-004 | Low |
| **Session replay after ban** | Platform integrity | Reuse a valid token post-ban | **Opaque sessions — revocation effective next request** | BR-035, EDGE-010 | **Very low — test B** |
| **WebSocket auth bypass** | Messages | Connect authenticated, then act after revocation | Auth at handshake **and re-checked on every event** | ADR-009 | Low |
| **Message spoofing / duplication** | Conversations | Forge sender; replay | Sender from session, never the payload; `UNIQUE (conversation_id, client_message_id)` | EDGE-021 | **Very low — test E** |
| **Malicious upload** | Server, users | Executable or polyglot disguised as an image | Magic-byte inspection in **private quarantine**; only 4 types; random keys; promotion after pass | SEC-012/013/015 | Low. **PDF malware not scanned — stated in ADR-013** |
| **MIME spoofing** | Server | `.pdf` extension on a ZIP | Extension and client MIME **ignored entirely** | SEC-013, EDGE-014 | Very low |
| **Stored XSS in admin** | Admin sessions | Post markup an admin views | Output encoding by default; strict CSP; no raw HTML | SEC-016 | Low |
| **SQL injection** | All data | Injected input | Parameterised queries exclusively via the ORM | SEC-016 | Very low |
| **Mass assignment** | Any entity | Extra fields in a payload | Explicit DTOs; unknown properties rejected | SEC-010 | Low |
| **SSRF via link preview** | Internal network | Point a URL at an internal address | **Server-side fetch**, deny-list of private ranges, no redirect chasing beyond a cap, size and time bounds | SEC-014 | Low |
| **Rate-limit bypass** | Everything | Rotate IPs or accounts | Limits **per account and per source** | SEC-005 | Medium |
| **Coordinated reporting** | Civic speech | Mass-report to silence criticism | Distinct-reporter counting; **auto-hide never deletes**; restore resets the count; every decision audited | BR-030/032, ADMIN-FR-003 | **Medium — RSK-010, a product risk, not only technical** |
| **Admin compromise** | Everything | Steal admin credentials | Separate store; 8-hour timeout; lockout; **every action audited** | SEC-020/022/024 | Medium — 🟥 admin 2FA out of scope |
| **Admin-on-admin lockout** | Team access | One admin bans the others | **No schema path and no route** | BR-ADM-001, SEC-021 | Very low |
| **Log leakage** | Personal data | Personal data in logs | Redaction before write; field names only, never values | PRIV-010, SEC-028 | Low |
| **Secrets in source** | Everything | Committed credential | Environment configuration only; CI secret scanning | SEC-025 | Low |
| **Backup exposure** | All data | Stolen backup | Encrypted at rest, stored separately, access-restricted | SEC-026/027 | Low |
| **Dependency vulnerability** | Everything | Compromised package | Automated scanning in CI; lockfiles; human review of new dependencies | — | Medium |
| **Insecure local storage** | Device data | Extracted app storage | `EncryptedSharedPreferences`; cache cleared on logout | SEC-004, SET-FR-006 | Low |
| **Lock-screen leakage** | Message previews | Read a preview without unlocking | 🟦 NOTIF-FR-004 **requires** a preview — **accepted residual risk, documented not hidden** | NOTIF-FR-004 | **Accepted** |

---

## 2. SEC-001 … SEC-028 → controls

| ID | Control | Where |
|---|---|---|
| SEC-001 | Argon2id, host-benchmarked | `09` §7 |
| SEC-002 | Password never logged, returned or in a URL | Redaction layer |
| SEC-003 | OTP hashed, single-use, 10 min, 5 attempts | `07`, `09` §2 |
| SEC-004 | Random hashed tokens, TLS, Keystore, revocable | ADR-008, `04` §4 |
| SEC-005 | Rate limits per account and source | `08` §5 |
| SEC-006 | Uniform body and timing | `09` §3 |
| SEC-007 | 10 failures → 30-min lockout | `09` §3 |
| SEC-008 | Reset token single-use, 15 min | `09` §2 |
| SEC-009 | All checks server-side | `03` §3 |
| SEC-010 | Every §12 rule re-enforced server-side | Global validation pipe |
| SEC-011 | Object-level check on every request | `09` §4 |
| SEC-012 | Size, count, type enforced server-side | ADR-013 |
| SEC-013 | Magic-byte inspection; executables rejected | ADR-013 |
| SEC-014 | Server-side preview fetch, SSRF-guarded | `11` §4 |
| SEC-015 | Random object keys; listing disabled | ADR-013 |
| SEC-016 | Parameterised queries; output encoding; CSP | `05` §6 |
| SEC-017 | HTTPS only; HTTP refused | `03` §3 |
| SEC-018 | Sanitised errors; correlation ID only | `contracts/error-catalogue.md` |
| SEC-019 | Block predicate on every read path | `06` §5 |
| SEC-020 | Two credential stores, two guards | `05` §1 |
| SEC-021 | Admin-target rejection, server-side + schema | `09` §6 |
| SEC-022 | Append-only audit incl. **sensitive views** | ADR-018 |
| SEC-023 | `UPDATE`/`DELETE`/`TRUNCATE` never granted to runtime | ADR-018 |
| SEC-024 | 8-hour admin timeout | `09` §6 |
| SEC-025 | Secrets in environment only; CI scanning | `14` §4 |
| SEC-026 | Daily backups, separate location, **restore tested** | `15` §5 |
| SEC-027 | TLS in transit; backups encrypted. 🟦 **Residency pending OD-019** | `14` §2 |
| SEC-028 | No message content, phone or token in device logs | `04` §4 |

---

## 3. PRIV-001 … PRIV-019 → controls

| ID | Control |
|---|---|
| PRIV-001 | Collection list is exactly the §14 set; no field exists outside it |
| PRIV-002 | DOB used only for the age gate; never displayed, never targeted |
| PRIV-003 | **`PublicProfileProjection` has no phone, email or DOB field to populate** |
| PRIV-004 | Public fields limited to the approved set; stated at registration |
| PRIV-005 | Self-service deletion in-product, both languages |
| PRIV-006 | Anonymisation explained **before** confirmation (UX-SET-009). 🟦 *Legal review* |
| PRIV-007 | Day-30 erasure job; per-module anonymisation contract. 🟦 *Legal review* |
| PRIV-008 | Phone/email/DOB only via admin lookup, **audited every time** |
| PRIV-009 | Conversations unreadable except a reported one, via its case, audited |
| PRIV-010 | 🟨 30-day log retention; no message text, password, OTP or token |
| PRIV-011 | **No server-side search history exists** — no endpoint, no table |
| PRIV-012 | No location, no fingerprinting, no ad IDs, no profiling analytics |
| PRIV-013 | Block removes visibility both ways, never disclosed |
| PRIV-014 | Explicit affirmative consent; never pre-checked |
| PRIV-015 | Push permission contextual; declining degrades only notifications |
| PRIV-016 | Licence limited to display, store and distribute in-product. 🟦 *Legal review* |
| PRIV-017 | Policy URL public and reachable. 🟦 **Blocks release — OD-015** |
| PRIV-018 | Terms and Guidelines both languages. 🟦 **Blocks release — OD-015** |
| PRIV-019 | 🟦 **No legal claim is made anywhere in Stage 4.** Pakistani obligations are for Shehersaaz — OD-019 |

---

## 4. Data classification

See `07` §7 for the full matrix. The three that govern the design:

1. **Phone, email, DOB — Sensitive.** Never in a mobile response. Admin access audited. Erased at day 30.
2. **Message bodies — Private.** Participants only; the single admin exception is a reported conversation, scoped to its case and audited.
3. **Recent searches — Device only.** No endpoint, no column, no log entry.

---

## 5. Aggregate metrics without profiling

🟦 **NFR-OBS-004 + PRIV-012** — measure the Stage 1 success criteria without profiling individuals.

🟩 Metrics are computed as **aggregate counts over the operational database**: registered users, monthly actives, posts, events, Urdu adoption, report-resolution time. No per-user event stream, no third-party analytics SDK, no behavioural profile. Urdu adoption is a `COUNT` grouped by `users.language`, not a tracked event.
