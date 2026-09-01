-- Runs once when the data directory is first created.
--
-- Everything is stored in UTC. Pakistan Standard Time is applied at the
-- presentation layer only, so a server or a developer laptop in another
-- timezone cannot shift stored timestamps.
ALTER DATABASE mohalla SET timezone TO 'UTC';
