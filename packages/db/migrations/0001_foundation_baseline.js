/**
 * 0001 - foundation baseline.
 *
 * Creates NO product table. Only:
 *   - extensions the platform needs
 *   - the identifier-generation strategy (ADR-021, two supported strategies)
 *   - a metadata table recording which strategy is in force
 *
 * Forward-only (ADR-008): `down` exists for local development only and is never
 * run against staging or production.
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // pgcrypto: peppered hashing for the ban list (banned_identifiers) and for
  // IP hashing in the audit log. gen_random_bytes / digest come from here.
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('platform_meta', {
    key: { type: 'text', primaryKey: true },
    value: { type: 'text', notNull: true },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.sql(`
    COMMENT ON TABLE platform_meta IS
      'Foundation metadata. Records decisions resolved at migration time, such as which UUIDv7 generation strategy this database supports.';
  `);

  // -------------------------------------------------------------------------
  // ADR-021 - UUIDv7 with TWO supported generation strategies.
  //
  // Native `uuidv7()` arrived in PostgreSQL 18. The architecture deliberately
  // supports an application-generated fallback so that hosting is never
  // constrained by the database's major version - if a managed provider only
  // offers 17, the platform still runs.
  //
  // This migration detects which is available and records it. It does not fail
  // on an older server.
  // -------------------------------------------------------------------------
  pgm.sql(`
    DO $$
    DECLARE
      has_native boolean;
    BEGIN
      has_native := to_regprocedure('uuidv7()') IS NOT NULL;

      IF has_native THEN
        EXECUTE $fn$
          CREATE OR REPLACE FUNCTION app_uuid_v7() RETURNS uuid
          LANGUAGE sql VOLATILE PARALLEL SAFE
          AS 'SELECT uuidv7()';
        $fn$;

        INSERT INTO platform_meta (key, value)
        VALUES ('uuid_strategy', 'native_pg_uuidv7')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
      ELSE
        INSERT INTO platform_meta (key, value)
        VALUES ('uuid_strategy', 'application_generated')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
      END IF;

      INSERT INTO platform_meta (key, value)
      VALUES ('postgres_version', current_setting('server_version'))
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
    END
    $$;
  `);

  pgm.sql(`
    GRANT SELECT ON platform_meta TO read_only_support;
  `);
};

exports.down = async (pgm) => {
  pgm.sql('DROP FUNCTION IF EXISTS app_uuid_v7()');
  pgm.dropTable('platform_meta');
  pgm.dropExtension('pgcrypto', { ifExists: true });
};
