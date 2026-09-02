import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

/**
 * Restore a pg_dump custom-format file into a TARGET database.
 *
 * The target is passed explicitly as RESTORE_TARGET_URL and MUST be different
 * from the source. Restoring over a live database by accident is exactly the
 * mistake this guard prevents: the script refuses when the target equals
 * ADMIN_DATABASE_URL, so a rehearsal cannot overwrite the primary.
 *
 * Usage: RESTORE_TARGET_URL=... node scripts/restore.mjs <dumpfile>
 */
const target = process.env.RESTORE_TARGET_URL;
const dump = process.argv[2];

if (!target || !dump) {
  console.error('FAIL: usage: RESTORE_TARGET_URL=... node scripts/restore.mjs <dumpfile>');
  process.exit(2);
}
if (!existsSync(dump)) {
  console.error(`FAIL: dump file not found: ${dump}`);
  process.exit(2);
}
if (target === process.env.ADMIN_DATABASE_URL) {
  console.error(
    'FAIL: RESTORE_TARGET_URL equals ADMIN_DATABASE_URL. Refusing to restore over the primary.',
  );
  process.exit(2);
}

const r = spawnSync(
  'pg_restore',
  ['--clean', '--if-exists', '--no-owner', '--dbname', target, dump],
  { stdio: 'inherit' },
);

if (r.error) {
  console.error(`FAIL: pg_restore could not run - ${r.error.message}`);
  process.exit(1);
}
// pg_restore exits non-zero on benign warnings; surface the code but do not mask it.
process.exit(r.status ?? 0);
