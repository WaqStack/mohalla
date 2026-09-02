/**
 * Injection token for the validated environment.
 *
 * An explicit token rather than relying on TypeScript type metadata: `Env` is a
 * zod-inferred type and erases at runtime, so there is nothing for the DI
 * container to key on.
 */
export const ENV = Symbol.for('mohalla.env');
