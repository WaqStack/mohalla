import type { ReactNode } from 'react';
import { DEFAULT_LOCALE, directionFor, type Locale } from '../lib/locale';
import './globals.css';

export const metadata = {
  title: 'Mohalla Admin',
  description: 'Shehersaaz Community Platform - administration console',
};

/**
 * Root layout.
 *
 * `dir` is set from the active locale on the `<html>` element. Every layout rule
 * in the admin console is written with logical properties, so the entire
 * interface mirrors from this one attribute - there is no separate RTL
 * stylesheet to maintain or forget.
 *
 * LOCALE-FR-003 / BR-041 / REL-002 require full mirroring, and the RTL lint rule
 * in `packages/eslint-plugin-mohalla` fails the build on any physical
 * `left`/`right` property that would break it.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  const locale: Locale = DEFAULT_LOCALE;
  return (
    <html lang={locale} dir={directionFor(locale)}>
      <body>{children}</body>
    </html>
  );
}
