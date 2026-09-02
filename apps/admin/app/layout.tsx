import type { ReactNode } from 'react';
import { DEFAULT_LOCALE, directionFor, type Locale } from '../lib/locale';
import { ErrorBoundary } from '../components/error-boundary';
import './globals.css';

export const metadata = {
  title: 'Mohalla Admin',
  description: 'Shehersaaz Community Platform - administration console',
};

/**
 * Root layout.
 *
 * `dir` is set from the active locale on the `<html>` element. Every layout rule
 * in the admin console uses logical properties, so the whole interface mirrors
 * from this one attribute - there is no separate RTL stylesheet to maintain or
 * forget. LOCALE-FR-003 / BR-041 / REL-002 require full mirroring, and the RTL
 * lint rule fails the build on any physical `left`/`right` property.
 *
 * The tree is wrapped in an ErrorBoundary so a render failure shows a message
 * rather than a blank page - the worst outcome for a moderator, because it is
 * indistinguishable from the tool being down.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  const locale: Locale = DEFAULT_LOCALE;
  return (
    <html lang={locale} dir={directionFor(locale)}>
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
