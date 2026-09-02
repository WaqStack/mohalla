import { execFileSync, spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * FOUNDATION SMOKE TEST
 *
 * Proves the foundation is actually wired together, end to end:
 *
 *   1. PostgreSQL answers
 *   2. Migrations are applied and match what is on disk
 *   3. The four database roles exist
 *   4. audit_log refuses UPDATE as runtime_app
 *   5. The API health endpoints answer
 *   6. A FOUNDATION_HEALTH_JOB round-trips through pg-boss
 *   7. A Socket.IO foundation ping returns a pong
 *
 * Every step reports PASS or FAIL with its real output. A step that cannot run
 * reports BLOCKED and names what is missing - it is never silently skipped and
 * never reported as a pass.
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '../..');

const results = [];
function record(name, status, detail) {
  results.push({ name, status, detail });
  const tag = status === 'PASS' ? 'PASS   ' : status === 'FAIL' ? 'FAIL   ' : 'BLOCKED';
  console.log(`[${tag}] ${name}${detail ? ` - ${detail}` : ''}`);
}

const dbUrl = process.env.DATABASE_URL;
const apiUrl = process.env.API_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;

// ------------------------------------------------------------------ 1. db up
let pg = null;
if (!dbUrl) {
  record('postgres reachable', 'BLOCKED', 'DATABASE_URL is not set');
} else {
  try {
    const { Client } = await import('pg');
    pg = new Client({ connectionString: dbUrl });
    await pg.connect();
    const r = await pg.query('select version() as v');
    record('postgres reachable', 'PASS', r.rows[0].v.split(',')[0]);
  } catch (e) {
    pg = null;
    record('postgres reachable', 'BLOCKED', e.message);
  }
}

// ------------------------------------------------------------ 2. migrations
if (!pg) {
  record('migrations applied', 'BLOCKED', 'no database connection');
} else {
  const r = spawnSync(
    process.execPath,
    [resolve(repoRoot, 'packages/db/scripts/migration-status.mjs')],
    {
      encoding: 'utf8',
      env: process.env,
    },
  );
  record(
    'migrations applied',
    r.status === 0 ? 'PASS' : 'FAIL',
    (r.stdout + r.stderr).trim().split('\n').pop(),
  );
}

// ----------------------------------------------------------------- 3. roles
if (!pg) {
  record('four database roles exist', 'BLOCKED', 'no database connection');
} else {
  try {
    const want = ['migration_owner', 'runtime_app', 'runtime_worker', 'read_only_support'];
    const r = await pg.query('SELECT rolname FROM pg_roles WHERE rolname = ANY($1)', [want]);
    const found = r.rows.map((x) => x.rolname);
    const missing = want.filter((x) => !found.includes(x));
    record(
      'four database roles exist',
      missing.length === 0 ? 'PASS' : 'FAIL',
      missing.length === 0 ? found.join(', ') : `missing: ${missing.join(', ')}`,
    );
  } catch (e) {
    record('four database roles exist', 'FAIL', e.message);
  }
}

// ------------------------------------------------------- 4. audit immutable
const runtimeUrl = process.env.RUNTIME_APP_DATABASE_URL;
if (!runtimeUrl) {
  record('audit_log refuses UPDATE as runtime_app', 'BLOCKED', 'RUNTIME_APP_DATABASE_URL not set');
} else {
  try {
    const { Client } = await import('pg');
    const c = new Client({ connectionString: runtimeUrl });
    await c.connect();
    let refused = false;
    let detail = '';
    try {
      await c.query("UPDATE audit_log SET action = 'tampered'");
    } catch (e) {
      refused = true;
      detail = e.message.split('\n')[0];
    }
    await c.end();
    record(
      'audit_log refuses UPDATE as runtime_app',
      refused ? 'PASS' : 'FAIL',
      refused ? detail : 'UPDATE SUCCEEDED - the audit log is NOT append-only',
    );
  } catch (e) {
    record('audit_log refuses UPDATE as runtime_app', 'BLOCKED', e.message);
  }
}

// ------------------------------------------------------------- 5. api health
for (const path of ['/health/live', '/health/ready']) {
  try {
    const res = await fetch(`${apiUrl}${path}`, { signal: AbortSignal.timeout(5000) });
    const body = await res.text();
    record(`GET ${path}`, res.ok ? 'PASS' : 'FAIL', `${res.status} ${body.slice(0, 120)}`);
  } catch (e) {
    record(`GET ${path}`, 'BLOCKED', `API not reachable at ${apiUrl} - ${e.message}`);
  }
}

// --------------------------------------------------------- 6. queue round trip
if (!pg) {
  record('FOUNDATION_HEALTH_JOB round trip', 'BLOCKED', 'no database connection');
} else {
  try {
    const marker = `smoke-${Date.now()}`;
    const enq = spawnSync(
      process.execPath,
      [resolve(repoRoot, 'apps/worker/dist/enqueue-health.js'), marker],
      { encoding: 'utf8', env: process.env },
    );
    if (enq.status !== 0) {
      record(
        'FOUNDATION_HEALTH_JOB round trip',
        'BLOCKED',
        (enq.stderr || enq.stdout).trim().split('\n').pop(),
      );
    } else {
      // Give the worker a moment, then look for a completed job.
      await new Promise((r) => setTimeout(r, 3000));
      const schema = process.env.PGBOSS_SCHEMA ?? 'pgboss';
      const q = await pg.query(
        `SELECT state FROM ${schema}.job WHERE data->>'marker' = $1 ORDER BY created_on DESC LIMIT 1`,
        [marker],
      );
      const state = q.rows[0]?.state ?? 'not found';
      record(
        'FOUNDATION_HEALTH_JOB round trip',
        state === 'completed' ? 'PASS' : 'FAIL',
        `job state: ${state} (worker must be running)`,
      );
    }
  } catch (e) {
    record('FOUNDATION_HEALTH_JOB round trip', 'BLOCKED', e.message);
  }
}

// ------------------------------------------------------- 7. socket.io ping
const socketPath = process.env.SOCKET_IO_PATH ?? '/realtime';
try {
  const { io } = await import('socket.io-client');
  const client = io(apiUrl, {
    path: socketPath,
    transports: ['websocket'],
    timeout: 5000,
    reconnection: false,
  });

  const pong = await new Promise((resolvePong) => {
    const timer = setTimeout(() => resolvePong({ ok: false, detail: 'no pong within 5s' }), 5000);
    client.on('connect_error', (e) =>
      resolvePong({ ok: false, detail: `connect_error: ${e.message}` }),
    );
    client.on('connect', () => {
      client.emit('foundation:ping', { nonce: 'smoke' }, (ack) => {
        clearTimeout(timer);
        resolvePong({ ok: Boolean(ack), detail: JSON.stringify(ack ?? {}).slice(0, 120) });
      });
    });
  });

  client.close();
  record('Socket.IO foundation ping/pong', pong.ok ? 'PASS' : 'FAIL', pong.detail);
} catch (e) {
  record('Socket.IO foundation ping/pong', 'BLOCKED', `API/socket not reachable - ${e.message}`);
}

await pg?.end().catch(() => {});

// ------------------------------------------------------------------- summary
const pass = results.filter((r) => r.status === 'PASS').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
const blocked = results.filter((r) => r.status === 'BLOCKED').length;

console.log(`\n${pass} passed, ${fail} failed, ${blocked} blocked, ${results.length} total`);

if (fail > 0) {
  console.error('\nFOUNDATION SMOKE TEST: FAILED');
  process.exit(1);
}
if (blocked > 0) {
  console.error(
    '\nFOUNDATION SMOKE TEST: INCOMPLETE - blocked steps did not run and must not be read as passes',
  );
  process.exit(2);
}
console.log('\nFOUNDATION SMOKE TEST: PASSED');
