import { adminEnv } from '../lib/env';
import { DEFAULT_LOCALE, directionFor } from '../lib/locale';
import { HealthPanel } from '../components/health-panel';

/**
 * Foundation landing page.
 *
 * STAGE 5 FOUNDATION. Proves the admin application builds, renders, mirrors, and
 * can reach the API. It contains NO admin feature - no moderation queue, no user
 * management, no reports, no login. Those are built from UI/UX section 27 and
 * SRS section 10.14 in their own epics.
 *
 * The environment/build panel is a development aid: it makes the running
 * artefact and its target API identifiable at a glance, which is exactly what a
 * smoke test needs to confirm.
 */
export default function Page() {
  const locale = DEFAULT_LOCALE;
  return (
    <main>
      <h1>Mohalla Admin - Foundation</h1>
      <p className="muted">
        Shehersaaz Community Platform. Development environment foundation only. No administration
        feature is implemented.
      </p>

      <div className="card">
        <strong>Build</strong>
        <dl className="kv">
          <dt>environment</dt>
          <dd>{adminEnv.NEXT_PUBLIC_ENVIRONMENT}</dd>
          <dt>version</dt>
          <dd className="mono">{adminEnv.NEXT_PUBLIC_APP_VERSION}</dd>
          <dt>commit</dt>
          <dd className="mono">{adminEnv.NEXT_PUBLIC_GIT_COMMIT}</dd>
          <dt>API base</dt>
          <dd className="mono">{adminEnv.NEXT_PUBLIC_API_BASE_URL}</dd>
        </dl>
      </div>

      <HealthPanel />

      <div className="card">
        <strong>Direction</strong>
        <p className="muted">
          locale <code>{locale}</code> - dir <code>{directionFor(locale)}</code>. Switching the
          locale to <code>ur</code> mirrors this entire page, including the accent bar on these
          cards, with no direction-specific CSS.
        </p>
      </div>
    </main>
  );
}
