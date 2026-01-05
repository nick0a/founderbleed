-- Reset database script
-- Drops all tables and allows fresh migration

-- Drop all tables in reverse dependency order
DROP TABLE IF EXISTS "share_link_views" CASCADE;
DROP TABLE IF EXISTS "share_links" CASCADE;
DROP TABLE IF EXISTS "report_access_log" CASCADE;
DROP TABLE IF EXISTS "shared_reports" CASCADE;
DROP TABLE IF EXISTS "role_recommendations" CASCADE;
DROP TABLE IF EXISTS "events" CASCADE;
DROP TABLE IF EXISTS "planning_sessions" CASCADE;
DROP TABLE IF EXISTS "notifications" CASCADE;
DROP TABLE IF EXISTS "scheduled_audits" CASCADE;
DROP TABLE IF EXISTS "audits" CASCADE;
DROP TABLE IF EXISTS "byok_keys" CASCADE;
DROP TABLE IF EXISTS "subscriptions" CASCADE;
DROP TABLE IF EXISTS "contacts" CASCADE;
DROP TABLE IF EXISTS "calendar_connections" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "verificationToken" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;

-- Also drop drizzle migration tracking table to allow fresh migration
DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE;
DROP TABLE IF EXISTS "drizzle.__drizzle_migrations" CASCADE;

-- Confirm reset
SELECT 'Database reset complete - ready for fresh migration' as status;
