-- =============================================================================
-- Packet Day — Read-only "current month" packet usage for the calling user
-- Migration: 014_get_my_packet_usage.sql
-- =============================================================================
--
-- app/dashboard/page.tsx and app/generate/page.tsx previously read
-- profiles.packets_used_this_month / packets_reset_date directly. Those
-- columns are only actually reset when check_and_increment_packet_usage next
-- runs an UPDATE for that user (migration 006) — nothing resets them on a
-- schedule (reset_monthly_packet_counts exists but nothing calls it; pg_cron
-- is not installed). So on the 1st of a new month, a user who last generated
-- in the prior month sees their stale prior-month count/date until they next
-- generate — a false "you're out of free packets" paywall message.
--
-- get_my_packet_usage() fixes the display side only: it computes the same
-- "is this stale" boundary as check_and_increment_packet_usage, but as a
-- plain SELECT, never an UPDATE, so the display can show the correct current
-- state without mutating anything or racing the real increment.
--
-- IMPORTANT: the `packets_reset_date < date_trunc('month', now())::date`
-- expression below must stay byte-for-byte identical to the one in
-- check_and_increment_packet_usage (migration 006). If that function's month
-- boundary ever changes, this one must change with it, or the display and
-- the real enforcement will drift apart again.
--
-- No p_user_id parameter — uses auth.uid() directly so a caller can only ever
-- read their own row, and returns zero rows if auth.uid() is null (not
-- logged in). This is safe to grant to `authenticated` directly, unlike
-- check_and_increment_packet_usage / decrement_packet_usage (service_role
-- only, migration 006) — this function never writes and never takes a
-- caller-supplied user id.
--
-- Two independent mechanisms grant EXECUTE by default and must both be
-- revoked: the implicit PUBLIC pseudo-role (Postgres default on function
-- creation), and this project's standing ALTER DEFAULT PRIVILEGES rule that
-- auto-grants EXECUTE to anon/authenticated on new functions. See
-- CLAUDE.md's Database migrations section.

create or replace function public.get_my_packet_usage()
returns table (
  packets_used integer,
  reset_date date
)
language sql
security definer
stable
set search_path = public
as $$
  select
    case
      when packets_reset_date < date_trunc('month', now())::date then 0
      else packets_used_this_month
    end as packets_used,
    case
      when packets_reset_date < date_trunc('month', now())::date then date_trunc('month', now())::date
      else packets_reset_date
    end as reset_date
  from public.profiles
  where id = auth.uid()
    and auth.uid() is not null;
$$;

revoke all on function public.get_my_packet_usage() from public;
revoke execute on function public.get_my_packet_usage() from anon;
grant execute on function public.get_my_packet_usage() to authenticated;
