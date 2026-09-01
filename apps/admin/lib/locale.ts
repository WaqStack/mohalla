export const LOCALES = ['en', 'ur'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/**
 * Urdu is right-to-left. English is left-to-right.
 *
 * This is the only place direction is decided. Components never branch on
 * locale to choose a side - they use logical properties and let `dir` mirror
 * them.
 */
export function directionFor(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ur' ? 'rtl' : 'ltr';
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}
