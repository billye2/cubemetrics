-- Admin allowlist. WHO may review feedback / see admin UI is decided here, and
-- nowhere else:
--   * NOT by a hardcoded email in source — that baked the owner's personal
--     address into a public repo.
--   * NOT by profiles.role — that row is user-updatable (the "Users can update
--     own profile" policy lets a user set their own role), so it is self-grantable.
--
-- RLS is ENABLED with NO policies, so anon/authenticated clients can neither
-- read nor write this table. Only the service-role client (createAdminSupabase,
-- which bypasses RLS) can read it — see isAdmin() in src/lib/modern/admin.ts.
-- Fail-closed: an unconfigured deploy (empty table) grants admin to no one.
--
-- NOTE: this file is schema-only. The actual admin email(s) are seeded as DATA
-- directly into the database, never committed here, so no personal address
-- enters the public repo.
CREATE TABLE IF NOT EXISTS public.app_admins (
  email      TEXT PRIMARY KEY,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- store lowercased so matching against auth email is case-insensitive
  CONSTRAINT app_admins_email_lowercase CHECK (email = lower(email))
);

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;
-- (intentionally no policies — service-role access only)
