import { Client } from 'pg';
import { readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Reports which migrations exist on disk and which have been applied.
 *
 * Exits non-zero when the two disagree, so CI and the smoke test can both use
 * it as a gate rather than a report nobody reads.
 */
const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = resolve(here, '../migrations');

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('FAIL: MIGRATION_DATABASE_URL or DATABASE_URL must be set');
  process.exit(2);
}

const onDisk = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => f.replace(/\.js$/, ''))
  .sort();

const client = new Client({ connectionString: url });

try {
  await client.connect();

  const tableExists = await client.query(
    `SELECT to_regclass('public.pgmigrations') IS NOT NULL AS present`,
  );

  let applied = [];
  if (tableExists.rows[0].present) {
    const r = await client.query('SELECT name FROM pgmigrations ORDER BY id');
    applied = r.rows.map((row) => row.name);
  }

  const pending = onDisk.filter((m) => !applied.includes(m));
  const unknown = applied.filter((m) => !onDisk.includes(m));

  console.log(`on disk : ${onDisk.length}`);
  for (const m of onDisk) {
    console.log(`  ${applied.includes(m) ? '[applied]' : '[PENDING]'} ${m}`);
  }

  if (unknown.length > 0) {
    console.error(`\nFAIL: applied but not on disk (${unknown.length}):`);
    for (const m of unknown) console.error(`  ${m}`);
    process.exit(1);
  }

  if (pending.length > 0) {
    console.error(`\nFAIL: ${pending.length} migration(s) pending`);
    process.exit(1);
  }

  console.log('\nOK: schema is up to date');
} catch (e) {
  console.error(`FAIL: ${e.message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
