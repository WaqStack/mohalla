import { z } from 'zod';

/**
 * Shared primitive schemas.
 *
 * STAGE 5 FOUNDATION. These are transport/format primitives only — the shapes
 * that every layer needs regardless of feature. **No product rule lives here**:
 * there is no registration schema, no post schema, no report schema. Those
 * belong to their modules.
 */

/** UUIDv7 is the identifier strategy (ADR-021), but any UUID parses here. */
export const uuid = z.string().uuid();

/**
 * Keyset pagination, matching the `(created_at DESC, id DESC)` ordering the
 * architecture uses everywhere. Offset pagination is deliberately absent - it
 * produces duplicates and gaps on a feed that changes while being read.
 */
export const keysetPagination = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().min(1).optional(),
});

export type KeysetPagination = z.infer<typeof keysetPagination>;

/** The two supported locales. Urdu is a peer, not a fallback. */
export const locale = z.enum(['en', 'ur']);
export type Locale = z.infer<typeof locale>;

/**
 * Pakistani mobile number, normalised to E.164.
 *
 * Present because OD-021 Option C makes a verified Pakistani mobile the
 * mandatory identity for every V1 account, so the FORMAT is a foundation
 * concern. This validates shape only - it performs no registration, no lookup,
 * no OTP, and no ban check. Those are AUTH-FR business logic and are not
 * implemented in Stage 5.
 */
export const pakistaniMobile = z
  .string()
  .trim()
  .regex(/^\+923\d{9}$/, 'must be a Pakistani mobile number in E.164 form, e.g. +923001234567');
