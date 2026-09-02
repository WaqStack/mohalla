import { z } from 'zod';

/**
 * Environment contract for the API process.
 *
 * Stage 5 foundation rule: the process refuses to start when configuration is
 * missing or malformed, rather than starting and failing later under load.
 * Every variable here is documented in `.env.example` and in
 * `docs/foundation/10-environment-variables.md`.
 *
 * No secret has a default value. `DATABASE_URL` deliberately has none.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  // No default. A missing database URL must stop the process.
  //
  // The message is set on the TYPE check as well as the length check: zod
  // reports the type failure first, so a variable that is entirely absent -
  // by far the most common misconfiguration - would otherwise produce
  // "expected string, received undefined" and never the intended message.
  DATABASE_URL: z.string({ error: 'DATABASE_URL is required' }).min(1, 'DATABASE_URL is required'),

  // Connection pool bounds - kept small for a modular monolith on managed PaaS.
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  DATABASE_CONNECT_TIMEOUT_MS: z.coerce.number().int().min(100).max(30_000).default(5_000),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  /**
   * Allowed browser origins, comma-separated.
   *
   * Empty means "no cross-origin browser access", which is the correct default:
   * the Android client is not a browser and is unaffected by CORS, and the
   * admin console is served from its own origin. An origin is added only when a
   * real deployment needs it - never `*`, which would let any page on the
   * internet issue credentialed requests.
   */
  CORS_ALLOWED_ORIGINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),

  /** Injected at build time so a running instance can identify its artefact. */
  APP_VERSION: z.string().default('0.0.0'),
  GIT_COMMIT: z.string().default('unknown'),

  /** Socket.IO mount path. Namespaced so it cannot collide with a REST route. */
  SOCKET_IO_PATH: z.string().startsWith('/').default('/realtime'),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    // Field names and messages only. Values are never printed - they may be
    // secrets, and a startup stack trace ends up in a log aggregator.
    const fields = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Invalid environment configuration:\n  ${fields}`);
  }
  return parsed.data;
}
