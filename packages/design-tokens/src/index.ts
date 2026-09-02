/**
 * Mohalla design tokens.
 *
 * GENERATED - do not edit by hand. Source of truth is the `:root` block of the
 * approved Stage 3 prototype, `docs/prototype.html`. Regenerate with:
 *
 *     npm run generate --workspace @mohalla/design-tokens
 *
 * 32 tokens are exported here, extracted verbatim from the approved prototype.
 * The Stage 3 UI/UX specification documents a larger token vocabulary
 * (50 distinct custom-property names appear across its examples); the
 * executable subset the prototype actually declares is what the foundation
 * ships, so that no token exists in code without an approved value behind it.
 * The remainder are added as the screens that use them are built.
 */
export const tokens = {
  /** `--bg-primary` - color */
  bgPrimary: '#F6F4EF',
  /** `--bg-secondary` - color */
  bgSecondary: '#EFECE5',
  /** `--surface-primary` - color */
  surfacePrimary: '#FFFFFF',
  /** `--surface-sunken` - color */
  surfaceSunken: '#F1EEE7',
  /** `--text-primary` - color */
  textPrimary: '#1C2530',
  /** `--text-secondary` - color */
  textSecondary: '#566573',
  /** `--text-tertiary` - color */
  textTertiary: '#8B98A5',
  /** `--text-inverse` - color */
  textInverse: '#FFFFFF',
  /** `--border-default` - color */
  borderDefault: '#E2DED5',
  /** `--border-strong` - color */
  borderStrong: '#CFC9BD',
  /** `--brand-primary` - color */
  brandPrimary: '#145A73',
  /** `--brand-primary-hover` - color */
  brandPrimaryHover: '#0F485C',
  /** `--brand-primary-subtle` - color */
  brandPrimarySubtle: '#E4EFF4',
  /** `--brand-secondary` - color */
  brandSecondary: '#6B4E9E',
  /** `--brand-secondary-subtle` - color */
  brandSecondarySubtle: '#EFEAF7',
  /** `--success` - color */
  success: '#1F7A5C',
  /** `--success-subtle` - color */
  successSubtle: '#E3F1EC',
  /** `--warning` - color */
  warning: '#9A6510',
  /** `--warning-subtle` - color */
  warningSubtle: '#FBF0DE',
  /** `--error` - color */
  error: '#A32C2C',
  /** `--error-subtle` - color */
  errorSubtle: '#FAE7E5',
  /** `--r-sm` - other */
  rSm: '8px',
  /** `--r-md` - other */
  rMd: '12px',
  /** `--r-lg` - other */
  rLg: '16px',
  /** `--r-xl` - other */
  rXl: '24px',
  /** `--r-full` - other */
  rFull: '999px',
  /** `--e1` - other */
  e1: '0 1px 2px rgba(28,37,48,.04), 0 2px 8px rgba(28,37,48,.06)',
  /** `--e2` - other */
  e2: '0 2px 4px rgba(28,37,48,.06), 0 8px 24px rgba(28,37,48,.10)',
  /** `--e3` - other */
  e3: '0 4px 8px rgba(28,37,48,.08), 0 16px 40px rgba(28,37,48,.14)',
  /** `--shell` - other */
  shell: '#20303C',
  /** `--shell-2` - other */
  shell2: '#2A3D4B',
  /** `--shell-t` - other */
  shellT: '#C6D4DE',
} as const;

export type TokenName = keyof typeof tokens;

/** The same tokens as CSS custom-property declarations, for a `:root` block. */
export function toCssVariables(): string {
  return Object.entries(CSS_NAMES)
    .map(([key, cssName]) => `  ${cssName}: ${tokens[key as TokenName]};`)
    .join('\n');
}

const CSS_NAMES: Record<TokenName, string> = {
  bgPrimary: '--bg-primary',
  bgSecondary: '--bg-secondary',
  surfacePrimary: '--surface-primary',
  surfaceSunken: '--surface-sunken',
  textPrimary: '--text-primary',
  textSecondary: '--text-secondary',
  textTertiary: '--text-tertiary',
  textInverse: '--text-inverse',
  borderDefault: '--border-default',
  borderStrong: '--border-strong',
  brandPrimary: '--brand-primary',
  brandPrimaryHover: '--brand-primary-hover',
  brandPrimarySubtle: '--brand-primary-subtle',
  brandSecondary: '--brand-secondary',
  brandSecondarySubtle: '--brand-secondary-subtle',
  success: '--success',
  successSubtle: '--success-subtle',
  warning: '--warning',
  warningSubtle: '--warning-subtle',
  error: '--error',
  errorSubtle: '--error-subtle',
  rSm: '--r-sm',
  rMd: '--r-md',
  rLg: '--r-lg',
  rXl: '--r-xl',
  rFull: '--r-full',
  e1: '--e1',
  e2: '--e2',
  e3: '--e3',
  shell: '--shell',
  shell2: '--shell-2',
  shellT: '--shell-t',
};
