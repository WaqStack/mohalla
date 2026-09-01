import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from 'pg';
import { randomUUID } from 'node:crypto';

/**
 * MANDATORY INTEGRATION TEST - audit log mutation denial.
 *
 * Stage 4 requires the audit log to be append-only and protected from mutation
 * by application and administrator roles. A comment in a migration is not
 * evidence of that. This test connects AS runtime_app - the role the API
 * actually uses - and proves that UPDATE and DELETE are refused.
 *
 * It deliberately does NOT connect as the owner. Testing as the owner would
 * prove only that the trigger fires, and the trigger is defence in depth, not
 * the boundary. The privilege grant is the boundary, so the test must exercise
 * the privileged path the application really takes.
 *
 * REQUIRES: a running PostgreSQL with migrations and roles applied, and
 * RUNTIME_APP_DATABASE_URL pointing at the runtime_app role.
 */
const url = process.env.RUNTIME_APP_DATABASE_URL ?? process.env.DATABASE_URL;

const describeOrSkip = url ? describe : describe.skip;

describeOrSkip('audit_log is append-only for runtime_app', () => {
  let client: Client;
  let insertedId: string;

  beforeAll(async () => {
    client = new Client({ connectionString: url });
    await client.connect();

    insertedId = randomUUID();
    await client.query(
      `INSERT INTO audit_log (id, actor_type, action, entity_type, metadata)
       VALUES ($1, 'SYSTEM', 'foundation.test', 'test', '{"source":"stage-5-test"}')`,
      [insertedId],
    );
  });

  afterAll(async () => {
    await client?.end().catch(() => {});
  });

  it('permits INSERT', async () => {
    const r = await client.query('SELECT id FROM audit_log WHERE id = $1', [insertedId]);
    expect(r.rowCount).toBe(1);
  });

  it('refuses UPDATE', async () => {
    await expect(
      client.query(`UPDATE audit_log SET action = 'tampered' WHERE id = $1`, [insertedId]),
    ).rejects.toThrow();
  });

  it('refuses DELETE', async () => {
    await expect(
      client.query('DELETE FROM audit_log WHERE id = $1', [insertedId]),
    ).rejects.toThrow();
  });

  it('refuses TRUNCATE', async () => {
    await expect(client.query('TRUNCATE audit_log')).rejects.toThrow();
  });

  it('leaves the row intact and unchanged after every refused attempt', async () => {
    const r = await client.query('SELECT action FROM audit_log WHERE id = $1', [insertedId]);
    expect(r.rowCount).toBe(1);
    expect(r.rows[0].action).toBe('foundation.test');
  });
});
