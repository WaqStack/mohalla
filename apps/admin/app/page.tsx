import { DEFAULT_LOCALE, directionFor } from '../lib/locale';

/**
 * Foundation landing page.
 *
 * STAGE 5 FOUNDATION. This page exists to prove the admin application builds,
 * renders, and mirrors correctly. It contains no admin feature - no moderation
 * queue, no user management, no reports. Those are built from UI/UX section 27
 * and SRS section 10.14 in their own epics.
 */
export default function Page() {
  const locale = DEFAULT_LOCALE;
  return (
    <main>
      <h1>Mohalla Admin - Foundation</h1>
      <p className="muted">
        Shehersaaz Community Platform. Development environment foundation only.
      </p>

      <div className="card">
        <strong>Build status</strong>
        <p className="muted">
          This application compiles and renders. No administration feature is implemented.
        </p>
      </div>

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
