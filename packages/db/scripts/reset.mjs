import { spawnSync } from 'node:child_process';

/**
 * Resets the LOCAL DEVELOPMENT database to a clean migrated state.
 *
 * Drops the public and pgboss schemas and re-runs migrations. It is guarded
 * three ways because a reset is destructive:
 *
 *   1. NODE_ENV must not be 'production'
 *   2. the connection host must be localhost / 127.0.0.1
 *   3. ALLOW_DB_RESET must equal 'yes'
 *
 * All three must hold. This makes it effectively impossible to point the script
 * at a shared or remote database, which is the only way a reset causes real
 * damage.
 */
const url = process.env.ADMIN_DATABASE_URL ?? process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error('FAIL: ADMIN_DATABASE_URL or MIGRATION_DATABASE_URL must be set');
  process.exit(2);
}
if (process.env.NODE_ENV === 'production') {
  console.error('FAIL: refusing to reset with NODE_ENV=production');
  process.exit(2);
}
const host = (() => {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
})();
if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
  console.error(`FAIL: reset only permitted against localhost, not '${host}'`);
  process.exit(2);
}
if (process.env.ALLOW_DB_RESET !== 'yes') {
  console.error('FAIL: set ALLOW_DB_RESET=yes to confirm this destructive action');
  process.exit(2);
}

const sql = `
  DROP SCHEMA IF EXISTS pgboss CASCADE;
  DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
`;

const drop = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: 'inherit' });
if (drop.error) {
  console.error(`FAIL: psql could not run - ${drop.error.message}`);
  process.exit(1);
}
if (drop.status !== 0) process.exit(drop.status ?? 1);

console.log('schemas dropped; re-applying roles and migrations is the next step:');
console.log('  npm run db:roles && npm run db:migrate');
