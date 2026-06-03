-- Privilege-escalation fix for public.profiles.
--
-- The "Users can update own profile" policy lets a user UPDATE any column of
-- their own row, including `role`. Combined with "SysOps can read all profiles"
-- (which trusts role = 'sysop'), a user could self-promote and read every other
-- user's profile:
--     update public.profiles set role = 'sysop' where id = auth.uid();
--
-- Fix: block role changes that originate from an end-user API request. PostgREST
-- runs those as the `authenticated`/`anon` Postgres roles, so we gate on
-- current_user. The service-role client (current_user = 'service_role') and
-- superuser migrations (e.g. 'postgres') can still set roles. The initial
-- role = 'user' is written via INSERT at signup, which this BEFORE UPDATE
-- trigger does not touch.
CREATE OR REPLACE FUNCTION public.prevent_profile_role_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role
     AND current_user IN ('authenticated', 'anon') THEN
    RAISE EXCEPTION 'profiles.role cannot be changed by users';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_block_role_change ON public.profiles;
CREATE TRIGGER profiles_block_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_change();
