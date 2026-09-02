import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPsqlFile } from './psql-runner.mjs';

/**
 * Applies roles/roles.sql via psql, passing role passwords as psql variables so
 * that no password is ever written to a file or into the repository.
 *
 * Uses host psql when available, otherwise the psql inside the project's
 * PostgreSQL container - the dev environment is Docker-first and does not
 * install a native client. Requires ADMIN_DATABASE_URL (the cluster owner).
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

const vars = [
  `migration_owner_password=${process.env.ROLE_MIGRATION_OWNER_PASSWORD}`,
  `runtime_app_password=${process.env.ROLE_RUNTIME_APP_PASSWORD}`,
  `runtime_worker_password=${process.env.ROLE_RUNTIME_WORKER_PASSWORD}`,
  `read_only_support_password=${process.env.ROLE_READ_ONLY_SUPPORT_PASSWORD}`,
  `db_name=${dbName}`,
];

process.exit(runPsqlFile(process.env.ADMIN_DATABASE_URL, vars, sqlPath));
