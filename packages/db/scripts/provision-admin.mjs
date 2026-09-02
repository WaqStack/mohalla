import { spawnSync } from 'node:child_process';

/**
 * ADMINISTRATOR PROVISIONING — MECHANISM ONLY.
 *
 * This is the technical-owner-controlled CLI path for creating the FIRST
 * administrator. Stage 5 builds the mechanism; it does NOT create an admin.
 *
 * WHAT THIS DELIBERATELY IS NOT (and must never become):
 *   - a /bootstrap-admin HTTP endpoint       — an unauthenticated admin-creation
 *                                               route is a standing back door
 *   - a /admin/register self-service route    — admins are provisioned, not self-served
 *   - a default/seeded admin account          — a known default credential is a breach
 *   - hardcoded credentials of any kind
 *
 * It runs from a shell the technical owner controls, against a database only the
 * owner can reach. That is the entire security model: possession of the owner's
 * database credential, not a network-reachable endpoint.
 *
 * IT IS BLOCKED ON OD-020. No administrator can actually be created until
 * Shehersaaz names the technical owner (DEP-016), because there is otherwise no
 * accountable human to own that account. Until then this script REFUSES to run
 * outside development, and even in development it only demonstrates the shape
 * using dev/test data.
 *
 * The `admins` table does not exist yet — it is owned by the `identity` module
 * and is created by that module's migration, in that module's epic. So this
 * script currently validates its inputs and its guards, prints exactly what it
 * WOULD do, and stops. That is the correct amount of mechanism for Stage 5:
 * everything except the part that needs a table that Stage 5 does not create.
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=')];
  }),
);

function fail(msg, code = 2) {
  console.error(`FAIL: ${msg}`);
  process.exit(code);
}

// ---- guard 1: environment ------------------------------------------------
const nodeEnv = process.env.NODE_ENV ?? 'development';
if (nodeEnv === 'production') {
  fail(
    'administrator provisioning is BLOCKED in production until OD-020 names the technical owner (DEP-016). ' +
      'No production admin is created in Stage 5.',
  );
}

// ---- guard 2: an owner must be named to run for real ---------------------
const ownerHandle = process.env.TECHNICAL_OWNER_HANDLE;
if (!ownerHandle) {
  console.error('BLOCKED: OD-020 is unresolved — TECHNICAL_OWNER_HANDLE is not set.');
  console.error('');
  console.error('This CLI is the mechanism for provisioning the first administrator, but an');
  console.error('administrator must belong to a named, accountable technical owner. Until');
  console.error('Shehersaaz names that person, no admin account is created — by design, not by');
  console.error('omission. See docs/foundation/12-secret-management.md and the OD-020 register.');
  process.exit(3);
}

// ---- guard 3: inputs -----------------------------------------------------
const username = args.username;
const displayName = args['display-name'];
if (!username || !displayName) {
  fail('usage: node provision-admin.mjs --username=<name> --display-name="<name>" [--dry-run]');
}
if (!/^[a-z0-9_]{3,30}$/.test(username)) {
  fail('username must be 3–30 chars of [a-z0-9_]');
}

// ---- guard 4: the table this needs does not exist in Stage 5 -------------
const url = process.env.MIGRATION_DATABASE_URL ?? process.env.ADMIN_DATABASE_URL;
let adminsTableExists = false;
if (url) {
  const check = spawnSync(
    'psql',
    [url, '-tAc', "SELECT to_regclass('public.admins') IS NOT NULL"],
    { encoding: 'utf8' },
  );
  adminsTableExists = check.status === 0 && check.stdout.trim() === 't';
}

console.log(
  JSON.stringify(
    {
      mechanism: 'admin-provisioning-cli',
      wouldCreate: { username, displayName, ownedBy: ownerHandle },
      passwordPolicy: 'set out-of-band via the identity module; never passed on the CLI',
      adminsTableExists,
      action: adminsTableExists
        ? 'ready — but this is Stage 5: no admin is created here'
        : 'the admins table does not exist yet (identity module, its own epic)',
      created: false,
      note: 'Stage 5 builds the mechanism only. No administrator account is created.',
    },
    null,
    2,
  ),
);

// Never create an account in Stage 5, regardless of flags.
process.exit(0);
