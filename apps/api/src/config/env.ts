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
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Connection pool bounds - kept small for a modular monolith on managed PaaS.
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).default(10),

  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    // Field names only. Values are never printed - they may be secrets.
    const fields = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Invalid environment configuration:\n  ${fields}`);
  }
  return parsed.data;
}
