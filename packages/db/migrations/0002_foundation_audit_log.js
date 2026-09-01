/**
 * 0002 - audit log foundation.
 *
 * The audit log is append-only and protected from mutation by application and
 * administrator roles.
 *
 * That protection is enforced twice, and the two are not equivalent:
 *
 *   1. PRIVILEGE (primary). runtime_app and runtime_worker are granted INSERT
 *      and SELECT and are explicitly denied UPDATE and DELETE. A role without
 *      the privilege cannot mutate a row no matter what SQL it sends. Because
 *      every application administrator acts through runtime_app, no in-app
 *      admin - however privileged in the product's own permission model - can
 *      alter or erase an audit row.
 *
 *   2. TRIGGER (defence in depth). Raises on UPDATE or DELETE. This catches a
 *      mistake made *while connected as the owner*, e.g. during a migration.
 *      It is not a security boundary: the owner can drop the trigger. The
 *      privilege grant is the boundary; the trigger is a guard rail.
 *
 * Neither protects against the infrastructure owner. A superuser, or whoever
 * holds the managed provider's owner credential, retains an emergency
 * capability to alter any table. Audit integrity therefore also depends on
 * restricting who holds that credential - which is an operational control, not
 * a schema one, and is documented in docs/foundation/12-secret-management.md.
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  pgm.createTable('audit_log', {
    // Time-ordered identifier so the log paginates by key rather than by
    // OFFSET, consistent with the keyset pagination used everywhere else.
    id: { type: 'uuid', primaryKey: true },

    occurred_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },

    // Who acted. Nullable actor_id covers system actions with no human actor.
    actor_type: { type: 'text', notNull: true },
    actor_id: { type: 'uuid', notNull: false },

    action: { type: 'text', notNull: true },

    entity_type: { type: 'text', notNull: true },
    entity_id: { type: 'uuid', notNull: false },

    // Structured detail. Must never contain a phone number, an email address,
    // a date of birth or a password hash - the log is retained pseudonymously
    // after erasure (OD-019), so anything identifying written here would
    // survive a deletion request.
    metadata: { type: 'jsonb', notNull: true, default: '{}' },

    correlation_id: { type: 'uuid', notNull: false },

    // Peppered hash, never a raw address.
    ip_hash: { type: 'bytea', notNull: false },
  });

  pgm.addConstraint('audit_log', 'audit_log_actor_type_check', {
    check: "actor_type IN ('USER', 'ADMIN', 'SYSTEM')",
  });

  // Read patterns: by entity, and by actor, both newest-first.
  pgm.createIndex('audit_log', ['entity_type', 'entity_id', 'occurred_at'], {
    name: 'audit_log_entity_idx',
  });
  pgm.createIndex('audit_log', ['actor_id', 'occurred_at'], {
    name: 'audit_log_actor_idx',
    where: 'actor_id IS NOT NULL',
  });

  pgm.sql(`
    COMMENT ON TABLE audit_log IS
      'Append-only. Protected from mutation by application and administrator roles via privilege (primary) and trigger (defence in depth). Not protected from the infrastructure owner.';
  `);

  // ---------------------------------------------------- 1. PRIVILEGE (primary)
  pgm.sql(`
    -- Undo the blanket default privilege for this table specifically.
    REVOKE ALL ON audit_log FROM runtime_app, runtime_worker;

    GRANT SELECT, INSERT ON audit_log TO runtime_app;
    GRANT SELECT, INSERT ON audit_log TO runtime_worker;

    -- Explicit and redundant after the REVOKE above, kept because it states the
    -- intent in a form a reviewer cannot misread.
    REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM runtime_app, runtime_worker;
    REVOKE ALL ON audit_log FROM PUBLIC;
  `);

  // ------------------------------------------- 2. TRIGGER (defence in depth)
  pgm.sql(`
    CREATE OR REPLACE FUNCTION audit_log_deny_mutation() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION
        'audit_log is append-only: % is not permitted', TG_OP
        USING ERRCODE = 'insufficient_privilege';
    END
    $$;

    CREATE TRIGGER audit_log_no_update
      BEFORE UPDATE ON audit_log
      FOR EACH ROW EXECUTE FUNCTION audit_log_deny_mutation();

    CREATE TRIGGER audit_log_no_delete
      BEFORE DELETE ON audit_log
      FOR EACH ROW EXECUTE FUNCTION audit_log_deny_mutation();

    CREATE TRIGGER audit_log_no_truncate
      BEFORE TRUNCATE ON audit_log
      FOR EACH STATEMENT EXECUTE FUNCTION audit_log_deny_mutation();
  `);
};

exports.down = async (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS audit_log_no_truncate ON audit_log;
    DROP TRIGGER IF EXISTS audit_log_no_delete ON audit_log;
    DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
    DROP FUNCTION IF EXISTS audit_log_deny_mutation();
  `);
  pgm.dropTable('audit_log');
};
