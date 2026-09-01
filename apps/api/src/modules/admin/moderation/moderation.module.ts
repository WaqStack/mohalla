import { Module } from '@nestjs/common';

/**
 * `moderation` - admin tier.
 *
 * STAGE 5 FOUNDATION SHELL. Intentionally empty.
 *
 * No controller, provider, entity, route or business rule exists here yet.
 * The shell exists so that the module boundary, the tier it belongs to and the
 * dependency-direction check are all in place and enforced *before* any feature
 * is written.
 *
 * Requirements owned by this module are listed in
 * `docs/architecture/06-backend-modules.md`. Implementation begins in the epic
 * that owns it - not in Stage 5.
 *
 * Audit emission is not optional and happens inside the same transaction as the action.
 */
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class ModerationModule {}
