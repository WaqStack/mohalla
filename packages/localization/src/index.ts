import en from './en/foundation.json';
import ur from './ur/foundation.json';

export const LOCALES = ['en', 'ur'] as const;
export type Locale = (typeof LOCALES)[number];

/**
 * String catalogues.
 *
 * English is the key language. Urdu is a peer, not a fallback - LOCALE-FR-001
 * and REL-002 require both, and `npm run guard:locale` fails the build when a
 * key exists in one catalogue and not the other. That check is the reason
 * DEP-011 (~400 Urdu strings, OD-016) cannot silently half-ship.
 *
 * Stage 5 seeds foundation keys only. No product copy is written here.
 */
export const catalogues: Record<Locale, Record<string, string>> = { en, ur };

export function translate(locale: Locale, key: string): string {
  const value = catalogues[locale][key];
  if (value === undefined) {
    // Returning the key makes a missing string visible in the UI rather than
    // rendering an empty space that nobody notices.
    return key;
  }
  return value;
}
