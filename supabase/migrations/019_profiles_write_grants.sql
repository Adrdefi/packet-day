-- Packet Day — profiles write grants
-- Migration: 019_profiles_write_grants.sql
--
-- Signed-in users may update only their own name and onboarding flag (RLS
-- still limits them to their own row). Every other profile write runs
-- server side with the service role or a security definer function.
--
-- Verify after applying: pg_class.relacl for public.profiles shows
-- anon=rxtm and authenticated=rxtm, and pg_attribute.attacl shows
-- {authenticated=w/postgres} on full_name and onboarding_completed only.

revoke update on public.profiles from anon, authenticated;

grant update (full_name, onboarding_completed) on public.profiles to authenticated;

-- Rows are created by the handle_new_user trigger (security definer) and
-- removed by account deletion; neither runs as these roles.
revoke insert, delete, truncate on public.profiles from anon, authenticated;
