/**
 * Module tier registry - the machine-readable form of
 * `docs/architecture/06-backend-modules.md` section 3.
 *
 * Dependencies point downward only:
 *
 *     Admin  ->  Product  ->  Platform  ->  (nothing)
 *
 * `scripts/posix/check-module-dependencies.mjs` reads this file and fails the
 * build on any import that violates the direction. The registry is the single
 * source of truth for that check - adding a module without adding it here is
 * itself a build failure.
 */
export const TIERS = ['platform', 'product', 'admin'] as const;
export type Tier = (typeof TIERS)[number];

/** A module may import from its own tier or any tier below it - never above. */
export const TIER_RANK: Record<Tier, number> = {
  platform: 0,
  product: 1,
  admin: 2,
};

export const MODULES: Record<Tier, readonly string[]> = {
  platform: ['identity', 'localization', 'media', 'audit', 'notifications'],
  product: [
    'profile',
    'social-graph',
    'safety',
    'posts',
    'engagement',
    'feed',
    'events',
    'messaging',
    'search',
    'settings',
  ],
  admin: ['moderation', 'admin-ops'],
};

export const MODULE_COUNT = MODULES.platform.length + MODULES.product.length + MODULES.admin.length;
