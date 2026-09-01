# Development Guide

**Mohalla — Shehersaaz Community Platform**

---

## 1. Toolchain

Every version is pinned. Details and the reasoning behind each choice:
[`docs/foundation/04-toolchain-versions.md`](docs/foundation/04-toolchain-versions.md).

| Tool | Version | Notes |
|---|---|---|
| **Node.js** | **24.20.0** LTS | `engine-strict=true` — a mismatch fails, it does not warn |
| **npm** | 11.19.0 | bundled with Node 24.20.0 |
| **JDK** | **21** Temurin | Android build |
| **Android SDK** | platform **36**, build-tools **36.0.0**, platform-tools **37.0.1** | |
| **Gradle** | **9.7.1** | via the wrapper — do not install separately |
| **Docker Desktop** | latest stable | local PostgreSQL 18 |
| **PostgreSQL** | **18** | via Docker |

**TypeScript is 6.0.3, not 7.0.2.** TypeScript 7 is stable, but `typescript-eslint` requires `<6.1.0`, and adopting TS 7 would disable the TypeScript lint path — including the RTL gate. That trade is not worth a newer compiler. See FOUNDATION-CONFLICT-004.

### Installing on Windows without administrator rights

Archive installs into `D:\toolchain\` work without elevation and pin more precisely than installers, because the checksum is verified explicitly. The JDK MSI fails with exit 1602 under UAC in a non-interactive shell.

```powershell
[Environment]::SetEnvironmentVariable('JAVA_HOME','D:\toolchain\jdk-21.0.12.1+1','User')
[Environment]::SetEnvironmentVariable('ANDROID_HOME','D:\toolchain\android-sdk','User')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT','D:\toolchain\android-sdk','User')
```

Verify:

```bash
node --version     # v24.20.0
java -version      # openjdk 21.0.12.1
javac -version     # javac 21.0.12.1
adb --version      # 37.0.1
```

---

## 2. First run

```bash
npm ci
cp .env.example .env
```

Generate role passwords and put them in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Start the database, create roles, migrate:

```bash
npm run infra:up
npm run db:roles
npm run db:migrate
npm run db:migrate:status
```

Build everything:

```bash
npm run build
```

---

## 3. Running the applications

| App | Command | URL |
|---|---|---|
| API | `npm run start --workspace @mohalla/api` | http://127.0.0.1:3000/health/live |
| Worker | `npm run start --workspace @mohalla/worker` | — |
| Admin | `npm run dev --workspace @mohalla/admin` | http://127.0.0.1:3000 |
| Android | `cd apps/android && ./gradlew installDebug` | device or emulator |

Prove the whole foundation works together:

```bash
npm run smoke
```

The smoke test reports **PASS**, **FAIL** or **BLOCKED** per step and exits `2` if anything was blocked. A step that could not run is never counted as a pass.

---

## 4. Before you push

```bash
npm run guard:all
npm run lint
npm run build
```

---

## 5. Writing code here

### Bilingual — both languages, always

Every user-facing string goes in **both** `packages/localization/src/en/` and `.../ur/`, and in both `values/strings.xml` and `values-ur/strings.xml` on Android. `npm run guard:locale` fails the build otherwise.

### RTL — logical properties only

| Use | Never |
|---|---|
| `margin-inline-start` | `margin-left` |
| `padding-inline-end` | `padding-right` |
| `inset-inline-start` | `left` |
| `text-align: start` | `text-align: left` |
| `Alignment.Start` (Compose) | `Alignment.Left` |
| `Modifier.padding(horizontal = …)` | `padding(start = …)` with a hardcoded `end` |

**Check your change in Urdu.** An interface that is *almost* mirrored is harder to spot than one that is obviously broken.

### Module boundaries

Dependencies point **downward only**: admin → product → platform.

Adding a module means adding it to `apps/api/src/modules/modules.registry.ts` **and** creating its directory. The guard fails if either is missing.

### Layers

- **No business rule in a controller.** Controllers validate shape and delegate.
- **Transaction boundary is the application service** — not the repository, not the controller.
- **Audit emission for admin actions happens inside the same transaction as the action.**

### Privacy

- Never return phone, email or date of birth from a public projection
- Never write an identifier into `audit_log.metadata` — the log survives erasure
- Every read path that returns user content composes the block predicate

---

## 6. Troubleshooting

**`engine-strict` rejects my Node version.** Install 24.20.0. The pin is deliberate; do not remove `engine-strict`.

**`docker: command not found`.** See [`docs/foundation/09-local-development.md`](docs/foundation/09-local-development.md). **Do not silently install PostgreSQL natively instead** — that is a recorded decision, not a shortcut.

**Gradle: "plugin no longer required since AGP 9.0".** AGP 9 has built-in Kotlin. Do not re-add `org.jetbrains.kotlin.android`.

**TypeScript: "Unexpected token as" from ESLint.** The TypeScript parser is not resolving. Run `npm ci`.

**`TS1479` — CommonJS cannot require an ESM module.** `apps/api` and `apps/worker` are ESM. Relative imports need explicit `.js` extensions.
