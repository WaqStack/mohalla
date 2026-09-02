-- =====================================================================
-- Mohalla - database roles
-- =====================================================================
-- Stage 4 ADR-018 / Stage 5 database foundation.
--
-- Four roles, separated so that no single connection string can both change the
-- schema and serve traffic, and so that the audit log is protected by database
-- privilege rather than by application discipline.
--
--   migration_owner     owns every object; the only role that may run DDL
--   runtime_app         the API process; DML only, and INSERT-only on audit
--   runtime_worker      the worker process; DML plus its own queue schema
--   read_only_support   support reads; SELECT only, and never on raw identifiers
--
-- WHAT THIS GUARANTEES, STATED EXACTLY
--
-- The audit log is append-only and protected from mutation by application and
-- administrator roles. It is NOT protected from the infrastructure owner: a
-- superuser, or whoever holds the managed provider's owner credential, retains
-- an emergency capability to alter any table. That capability is deliberate -
-- there must be a route to repair a corrupted database - and it is why audit
-- integrity also depends on restricting who holds those credentials.
--
-- Run as a cluster superuser (or the managed provider's owner role):
--
--   psql "$ADMIN_DATABASE_URL" \
--     -v migration_owner_password="..." \
--     -v runtime_app_password="..." \
--     -v runtime_worker_password="..." \
--     -v read_only_support_password="..." \
--     -v db_name="mohalla" \
--     -f roles.sql
--
-- No password is stored in this file or anywhere in the repository.
-- =====================================================================

\set ON_ERROR_STOP on

-- ---------------------------------------------------------------- role create
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'migration_owner') THEN
    CREATE ROLE migration_owner LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'runtime_app') THEN
    CREATE ROLE runtime_app LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'runtime_worker') THEN
    CREATE ROLE runtime_worker LOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'read_only_support') THEN
    CREATE ROLE read_only_support LOGIN;
  END IF;
END
$$;

ALTER ROLE migration_owner   WITH PASSWORD :'migration_owner_password';
ALTER ROLE runtime_app       WITH PASSWORD :'runtime_app_password';
ALTER ROLE runtime_worker    WITH PASSWORD :'runtime_worker_password';
ALTER ROLE read_only_support WITH PASSWORD :'read_only_support_password';

-- None of these roles may create databases or roles, and none is a superuser.
ALTER ROLE migration_owner   NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
ALTER ROLE runtime_app       NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
ALTER ROLE runtime_worker    NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
ALTER ROLE read_only_support NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;

-- ------------------------------------------------------------------- connect
REVOKE ALL ON DATABASE :"db_name" FROM PUBLIC;

GRANT CONNECT ON DATABASE :"db_name" TO migration_owner;
GRANT CONNECT ON DATABASE :"db_name" TO runtime_app;
GRANT CONNECT ON DATABASE :"db_name" TO runtime_worker;
GRANT CONNECT ON DATABASE :"db_name" TO read_only_support;

-- migration_owner is the DDL role. It needs CREATE on the database to create
-- schemas and to install TRUSTED extensions (e.g. pgcrypto, used for the
-- peppered ban-list hash and audit IP hashing). This is a migration-time
-- privilege, not a runtime one: the runtime roles are never granted it, so the
-- application can never run DDL. An UNtrusted extension would still require a
-- superuser and would be pre-created out of band - none is used.
GRANT CREATE ON DATABASE :"db_name" TO migration_owner;

-- The public schema is not a dumping ground. Only the owner may create in it.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO migration_owner;
GRANT USAGE ON SCHEMA public TO runtime_app, runtime_worker, read_only_support;

-- Queue schema belongs to the worker's queue library (ADR-010), owned by the
-- migration role so the worker cannot redefine it.
CREATE SCHEMA IF NOT EXISTS pgboss AUTHORIZATION migration_owner;
GRANT USAGE ON SCHEMA pgboss TO runtime_worker, runtime_app;

-- ------------------------------------------------------- default privileges
-- Applied to objects the migration role creates from now on, so a new table
-- does not silently arrive with no grants and break the API at deploy time.
ALTER DEFAULT PRIVILEGES FOR ROLE migration_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO runtime_app;

ALTER DEFAULT PRIVILEGES FOR ROLE migration_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO runtime_worker;

ALTER DEFAULT PRIVILEGES FOR ROLE migration_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO runtime_app, runtime_worker;

ALTER DEFAULT PRIVILEGES FOR ROLE migration_owner IN SCHEMA pgboss
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO runtime_worker, runtime_app;

ALTER DEFAULT PRIVILEGES FOR ROLE migration_owner IN SCHEMA pgboss
  GRANT USAGE, SELECT ON SEQUENCES TO runtime_worker, runtime_app;

-- read_only_support gets NO blanket table grant.
--
-- Deliberate. PRIV/SEC requirements keep phone, email and date of birth away
-- from support staff, so support reads are granted per-view on explicitly
-- non-identifying projections. No such view exists yet, so support can connect
-- and see nothing. That is the correct starting state.

\echo 'roles.sql applied'
