import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/**
 * Runs psql either on the host (if `psql` is on PATH) or inside the project's
 * PostgreSQL container.
 *
 * This project's dev environment is Docker-first (ADR-016 / the local Compose
 * file), and we deliberately do NOT install a native PostgreSQL client - that
 * would be a second, unpinned copy of the database tooling. So when `psql` is
 * not on PATH, these scripts use the psql that already exists INSIDE the running
 * container, reading the SQL from stdin (`-f -`).
 *
 * The container path connects as a local user inside the container, so it needs
 * the user and database name, not the full host URL. Both are derived from the
 * URL the caller already provides.
 *
 * Set `DB_DOCKER_CONTAINER=''` to force the host path (e.g. in CI, where psql is
 * installed and there is no container).
 */
function hostHasPsql() {
  const probe = spawnSync('psql', ['--version'], { stdio: 'ignore' });
  return !probe.error;
}

function parseUrl(url) {
  const u = new URL(url);
  return {
    user: decodeURIComponent(u.username),
    db: u.pathname.replace(/^\//, '') || 'postgres',
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port || '5432',
  };
}

/**
 * @param {string} url        connection URL (owner/admin)
 * @param {string[]} vars     ["name=value", ...] passed as psql -v
 * @param {string} sqlPath    path to a .sql file to execute
 * @returns {number}          exit code
 */
export function runPsqlFile(url, vars, sqlPath) {
  const container =
    process.env.DB_DOCKER_CONTAINER === undefined
      ? 'mohalla-postgres'
      : process.env.DB_DOCKER_CONTAINER;

  const vArgs = vars.flatMap((v) => ['-v', v]);

  if (hostHasPsql()) {
    const r = spawnSync('psql', [url, ...vArgs, '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], {
      stdio: 'inherit',
    });
    if (r.error) {
      console.error(`FAIL: could not run psql - ${r.error.message}`);
      return 1;
    }
    return r.status ?? 1;
  }

  if (!container) {
    console.error('FAIL: psql is not on PATH and no DB_DOCKER_CONTAINER is set.');
    console.error('Install the PostgreSQL client tools, or run the database container.');
    return 1;
  }

  // No host psql: run the container's psql, feeding the SQL over stdin.
  const { user, db } = parseUrl(url);
  const sql = readFileSync(sqlPath, 'utf8');
  const r = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      container,
      'psql',
      '-U',
      user,
      '-d',
      db,
      ...vArgs,
      '-v',
      'ON_ERROR_STOP=1',
      '-f',
      '-',
    ],
    { input: sql, stdio: ['pipe', 'inherit', 'inherit'] },
  );
  if (r.error) {
    console.error(`FAIL: could not run psql via docker - ${r.error.message}`);
    console.error(`Is the '${container}' container running? Try: npm run infra:up`);
    return 1;
  }
  return r.status ?? 1;
}

/**
 * Runs an inline SQL string (host psql or container psql).
 * @returns {number} exit code
 */
export function runPsqlInline(url, sql) {
  const container =
    process.env.DB_DOCKER_CONTAINER === undefined
      ? 'mohalla-postgres'
      : process.env.DB_DOCKER_CONTAINER;

  if (hostHasPsql()) {
    const r = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-c', sql], { stdio: 'inherit' });
    if (r.error) {
      console.error(`FAIL: could not run psql - ${r.error.message}`);
      return 1;
    }
    return r.status ?? 1;
  }

  if (!container) {
    console.error('FAIL: psql is not on PATH and no DB_DOCKER_CONTAINER is set.');
    return 1;
  }

  const { user, db } = parseUrl(url);
  const r = spawnSync(
    'docker',
    ['exec', '-i', container, 'psql', '-U', user, '-d', db, '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { stdio: 'inherit' },
  );
  if (r.error) {
    console.error(`FAIL: could not run psql via docker - ${r.error.message}`);
    return 1;
  }
  return r.status ?? 1;
}
