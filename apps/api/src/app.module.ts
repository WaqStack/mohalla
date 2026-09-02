import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { CorrelationMiddleware } from './common/correlation/correlation.middleware.js';

// The 17 module shells defined in docs/architecture/06-backend-modules.md
// section 4. Every one is registered and every one is empty.
import { IdentityModule } from './modules/platform/identity/identity.module.js';
import { LocalizationModule } from './modules/platform/localization/localization.module.js';
import { MediaModule } from './modules/platform/media/media.module.js';
import { AuditModule } from './modules/platform/audit/audit.module.js';
import { NotificationsModule } from './modules/platform/notifications/notifications.module.js';
import { ProfileModule } from './modules/product/profile/profile.module.js';
import { SocialGraphModule } from './modules/product/social-graph/social-graph.module.js';
import { SafetyModule } from './modules/product/safety/safety.module.js';
import { PostsModule } from './modules/product/posts/posts.module.js';
import { EngagementModule } from './modules/product/engagement/engagement.module.js';
import { FeedModule } from './modules/product/feed/feed.module.js';
import { EventsModule } from './modules/product/events/events.module.js';
import { MessagingModule } from './modules/product/messaging/messaging.module.js';
import { SearchModule } from './modules/product/search/search.module.js';
import { SettingsModule } from './modules/product/settings/settings.module.js';
import { ModerationModule } from './modules/admin/moderation/moderation.module.js';
import { AdminOpsModule } from './modules/admin/admin-ops/admin-ops.module.js';

/**
 * Root application module.
 *
 * All 17 module shells are registered so the boundary set is complete and the
 * dependency-direction check has something real to verify. They export nothing
 * and provide nothing, so registering them cannot create a coupling.
 *
 * The only routes served are the three health endpoints, plus the Socket.IO
 * foundation ping.
 */
@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    RealtimeModule,

    // ---- Platform tier (depends on nothing in the product tier) ----
    IdentityModule,
    LocalizationModule,
    MediaModule,
    AuditModule,
    NotificationsModule,

    // ---- Product tier ----
    ProfileModule,
    SocialGraphModule,
    SafetyModule,
    PostsModule,
    EngagementModule,
    FeedModule,
    EventsModule,
    MessagingModule,
    SearchModule,
    SettingsModule,

    // ---- Admin tier ----
    ModerationModule,
    AdminOpsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Every route, including health - a health check failure is exactly the
    // kind of event that needs to be correlatable with its logs.
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
