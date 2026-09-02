import { z } from 'zod';

/**
 * Framework-agnostic validation result.
 *
 * Kept free of NestJS imports so the same helper can be used by the worker, by
 * scripts, and by tests - none of which run inside NestJS.
 */
export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationOutcome<T> =
  { ok: true; value: T } | { ok: false; issues: ValidationIssue[] };

export function validate<T>(schema: z.ZodType<T>, input: unknown): ValidationOutcome<T> {
  const parsed = schema.safeParse(input);
  if (parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => ({
      path: i.path.join('.') || '(root)',
      // The message only. Never the received value - it may be a password,
      // a phone number, or an OTP, and validation errors get logged.
      message: i.message,
    })),
  };
}
