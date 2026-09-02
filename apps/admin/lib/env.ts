import { z } from 'zod';

/**
 * Environment contract for the admin console.
 *
 * Next.js inlines `NEXT_PUBLIC_*` variables into the browser bundle at build
 * time. That is exactly why only non-secret values appear here: an API base URL
 * and build identifiers. **A secret placed in a `NEXT_PUBLIC_` variable is
 * shipped to every visitor**, so the naming convention is a safety boundary,
 * not a style choice.
 *
 * Validation runs at module load. A missing or malformed value fails the build
 * rather than producing a console that renders and then cannot reach anything.
 */
const schema = z.object({
  NEXT_PUBLIC_ENVIRONMENT: z
    .enum(['development', 'test', 'staging', 'production'])
    .default('development'),

  /** No trailing slash - the API client joins paths itself. */
  NEXT_PUBLIC_API_BASE_URL: z
    .string()
    .url('NEXT_PUBLIC_API_BASE_URL must be an absolute URL')
    .default('http://127.0.0.1:3000')
    .transform((v) => v.replace(/\/+$/, '')),

  NEXT_PUBLIC_APP_VERSION: z.string().default('0.0.0'),
  NEXT_PUBLIC_GIT_COMMIT: z.string().default('unknown'),
});

export type AdminEnv = z.infer<typeof schema>;

export function parseAdminEnv(source: Record<string, string | undefined>): AdminEnv {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    // Field names only. Never values.
    const fields = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n  ');
    throw new Error(`Invalid admin environment configuration:\n  ${fields}`);
  }
  return parsed.data;
}

/**
 * Read explicitly rather than by spreading `process.env`.
 *
 * Next.js only inlines statically-analysable member accesses. `process.env`
 * spread into an object is NOT inlined and arrives empty in the browser, which
 * is a silent failure mode - the defaults would apply and nobody would notice.
 */
export const adminEnv: AdminEnv = parseAdminEnv({
  NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT,
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  NEXT_PUBLIC_GIT_COMMIT: process.env.NEXT_PUBLIC_GIT_COMMIT,
});
