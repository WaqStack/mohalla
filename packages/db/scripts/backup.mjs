import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Logical backup via pg_dump.
 *
 * Writes a custom-format dump (-Fc), which is compressed and can be restored
 * selectively with pg_restore. Uses ADMIN_DATABASE_URL or MIGRATION_DATABASE_URL
 * - a backup must see every object, so it runs as an owner, never as runtime_app.
 *
 * This is the LOCAL / rehearsal path. In production the managed provider's
 * automated backups are authoritative (ADR-016); this script exists so the
 * restore procedure can be REHEARSED, which an un-rehearsed provider backup
 * never is.
 */
const url = process.env.ADMIN_DATABASE_URL ?? process.env.MIGRATION_DATABASE_URL;
if (!url) {
  console.error('FAIL: ADMIN_DATABASE_URL or MIGRATION_DATABASE_URL must be set');
  process.exit(2);
}

const outDir = process.env.BACKUP_DIR ?? resolve(process.cwd(), '.backups');
mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = resolve(outDir, `mohalla-${stamp}.dump`);

const r = spawnSync('pg_dump', ['--format=custom', '--no-owner', '--file', outFile, url], {
  stdio: 'inherit',
});

if (r.error) {
  console.error(`FAIL: pg_dump could not run - ${r.error.message}`);
  console.error('pg_dump ships with the PostgreSQL client tools and must be on PATH.');
  process.exit(1);
}
if (r.status !== 0) process.exit(r.status ?? 1);

console.log(outFile);
