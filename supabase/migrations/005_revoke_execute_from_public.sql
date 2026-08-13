-- =============================================================================
-- Packet Day — Correct 004: revoke EXECUTE from PUBLIC, not just anon/authenticated
-- Migration: 005_revoke_execute_from_public.sql
-- =============================================================================
--
-- Migration 004 revoked EXECUTE from the anon and authenticated roles
-- specifically, but pg_proc.proacl showed the actual grant keeping these
-- functions open was to PUBLIC (the "=X/postgres" ACL entry) — Postgres's
-- implicit default grant to every role on function creation. anon and
-- authenticated never held a distinct per-role grant; they were (and, until
-- this migration, still are) reachable purely through PUBLIC membership, which
-- 004 did not touch. This migration closes that gap.

revoke execute on function public.reset_monthly_packet_counts() from public;
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.handle_new_user() from public;

-- increment_packet_view is intentionally public — not touched.
-- Re-grant EXECUTE to service_role explicitly on the three functions above so
-- a future server-side/service-role caller (e.g. a real cron path for
-- reset_monthly_packet_counts) is not accidentally blocked by this revoke.
grant execute on function public.reset_monthly_packet_counts() to service_role;
grant execute on function public.rls_auto_enable() to service_role;
grant execute on function public.handle_new_user() to service_role;
