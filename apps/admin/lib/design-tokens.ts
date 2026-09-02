import { tokens, type TokenName } from '@mohalla/design-tokens';

/**
 * Bridges the generated design tokens into the admin console.
 *
 * The tokens are GENERATED from the approved Stage 3 prototype
 * (`docs/prototype.html`) - see `packages/design-tokens`. Nothing here invents a
 * colour, spacing or radius value; every value traces back to an approved
 * token. The admin's `globals.css` also declares a small hand-authored subset
 * for layout primitives, and this bridge exists so a component can reach the
 * full generated set by name without hardcoding a hex string.
 */
export function token(name: TokenName): string {
  return tokens[name];
}

export { tokens };
export type { TokenName };
