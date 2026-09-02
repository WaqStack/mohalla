import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';

/**
 * ROLE PRIVILEGE VERIFICATION.
 *
 * The four-role model (ADR-018) is only real if the privileges are actually
 * enforced by PostgreSQL. This connects as each runtime role and proves what it
 * CAN and CANNOT do - a comment in roles.sql is not evidence.
 *
 * REQUIRES a running PostgreSQL with roles applied, and connection URLs for the
 * roles under test. When they are absent the whole suite is SKIPPED (not
 * failed) - a machine without a database cannot run it, and a skipped suite is
 * honest where a fabricated pass is not.
 */
const runtimeAppUrl = process.env.RUNTIME_APP_DATABASE_URL;
const readOnlyUrl = process.env.READ_ONLY_SUPPORT_DATABASE_URL;
const migrationUrl = process.env.MIGRATION_DATABASE_URL;

const canRun = Boolean(runtimeAppUrl);
const describeOrSkip = canRun ? describe : describe.skip;

describeOrSkip('runtime_app privileges', () => {
  let app: Client;

  beforeAll(async () => {
    app = new Client({ connectionString: runtimeAppUrl });
    await app.connect();
  });
  afterAll(async () => {
    await app?.end().catch(() => undefined);
  });

  it('may read platform_meta', async () => {
    const r = await app.query('SELECT key FROM platform_meta LIMIT 1');
    expect(r).toBeDefined();
  });

  it('may INSERT into audit_log', async () => {
    await expect(
      app.query(
        `INSERT INTO audit_log (id, actor_type, action, entity_type, metadata)
         VALUES (gen_random_uuid(), 'SYSTEM', 'role.test', 'test', '{}')`,
      ),
    ).resolves.toBeDefined();
  });

  it('may NOT run DDL - CREATE TABLE is refused', async () => {
    await expect(app.query('CREATE TABLE role_test_should_fail (id int)')).rejects.toThrow();
  });

  it('may NOT DROP a table', async () => {
    await expect(app.query('DROP TABLE audit_log')).rejects.toThrow();
  });
});

describe.skipIf(!readOnlyUrl)('read_only_support privileges', () => {
  let ro: Client;

  beforeAll(async () => {
    ro = new Client({ connectionString: readOnlyUrl });
    await ro.connect();
  });
  afterAll(async () => {
    await ro?.end().catch(() => undefined);
  });

  it('may read platform_meta (an explicitly granted table)', async () => {
    await expect(ro.query('SELECT key FROM platform_meta LIMIT 1')).resolves.toBeDefined();
  });

  it('may NOT INSERT into audit_log', async () => {
    await expect(
      ro.query(
        `INSERT INTO audit_log (id, actor_type, action, entity_type, metadata)
         VALUES (gen_random_uuid(), 'SYSTEM', 'ro.test', 'test', '{}')`,
      ),
    ).rejects.toThrow();
  });

  it('may NOT INSERT into platform_meta - support reads, never writes', async () => {
    await expect(
      ro.query(`INSERT INTO platform_meta (key, value) VALUES ('x', 'y')`),
    ).rejects.toThrow();
  });
});

describe.skipIf(!migrationUrl)('migration_owner privileges', () => {
  let owner: Client;

  beforeAll(async () => {
    owner = new Client({ connectionString: migrationUrl });
    await owner.connect();
  });
  afterAll(async () => {
    await owner?.end().catch(() => undefined);
  });

  it('may create and drop a scratch table (it owns the schema)', async () => {
    await owner.query('CREATE TABLE IF NOT EXISTS migration_owner_scratch (id int)');
    await owner.query('DROP TABLE migration_owner_scratch');
    expect(true).toBe(true);
  });
});
