import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Applies roles/roles.sql via psql, passing role passwords as psql variables so
 * that no password is ever written to a file or into the repository.
 *
 * Requires `psql` on PATH and ADMIN_DATABASE_URL (the cluster owner).
 */
const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(here, '../roles/roles.sql');

const required = [
  'ADMIN_DATABASE_URL',
  'ROLE_MIGRATION_OWNER_PASSWORD',
  'ROLE_RUNTIME_APP_PASSWORD',
  'ROLE_RUNTIME_WORKER_PASSWORD',
  'ROLE_READ_ONLY_SUPPORT_PASSWORD',
];

const missing = required.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`FAIL: missing required variables:\n  ${missing.join('\n  ')}`);
  process.exit(2);
}

const placeholders = required.filter((k) => process.env[k] === 'CHANGE_ME');
if (placeholders.length > 0) {
  console.error(
    `FAIL: these still hold the placeholder value CHANGE_ME:\n  ${placeholders.join('\n  ')}`,
  );
  process.exit(2);
}

const dbName = process.env.DATABASE_NAME ?? 'mohalla';

const args = [
  process.env.ADMIN_DATABASE_URL,
  '-v',
  `migration_owner_password=${process.env.ROLE_MIGRATION_OWNER_PASSWORD}`,
  '-v',
  `runtime_app_password=${process.env.ROLE_RUNTIME_APP_PASSWORD}`,
  '-v',
  `runtime_worker_password=${process.env.ROLE_RUNTIME_WORKER_PASSWORD}`,
  '-v',
  `read_only_support_password=${process.env.ROLE_READ_ONLY_SUPPORT_PASSWORD}`,
  '-v',
  `db_name=${dbName}`,
  '-f',
  sqlPath,
];

const r = spawnSync('psql', args, { stdio: 'inherit' });

if (r.error) {
  console.error(`FAIL: could not run psql - ${r.error.message}`);
  console.error('psql must be on PATH. It ships with PostgreSQL client tools.');
  process.exit(1);
}
process.exit(r.status ?? 1);
