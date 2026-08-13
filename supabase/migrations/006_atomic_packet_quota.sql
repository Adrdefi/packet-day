-- =============================================================================
-- Packet Day — Atomic packet-quota check/reserve + compensating rollback
-- Migration: 006_atomic_packet_quota.sql
-- =============================================================================
--
-- Replaces the JS-side read-then-write quota pattern in
-- app/api/generate-packet/route.ts (a check-then-act race independent of the
-- separate lazy-reset bug) with a single atomic statement per operation.
--
-- check_and_increment_packet_usage: in one UPDATE, resets the count if
-- packets_reset_date is before the current month, enforces the caller-supplied
-- limit against the effective (post-reset) count, and increments only if
-- allowed. Zero rows returned means "not allowed" — no separate boolean can
-- get out of sync with the actual write. p_limit = null means unlimited (pro).
--
-- decrement_packet_usage: compensating rollback. The route calls this if
-- generation fails after check_and_increment_packet_usage already reserved a
-- slot, so a failed generation still doesn't burn quota (existing behavior,
-- preserved).
--
-- Both are SECURITY DEFINER, granted to service_role only — the app must call
-- them via a service-role client, not the user-session client, matching the
-- established pattern from migrations 004/005.
--
-- Two independent mechanisms grant EXECUTE by default and must both be
-- revoked: the implicit PUBLIC pseudo-role (Postgres default on function
-- creation), and this project's standing ALTER DEFAULT PRIVILEGES rule that
-- auto-grants EXECUTE to anon/authenticated on new functions. Revoking from
-- public alone left check_and_increment_packet_usage live to anon/authenticated
-- when first applied — caught via pg_proc.proacl, corrected below. See
-- CLAUDE.md's Database migrations section.

create or replace function public.check_and_increment_packet_usage(
  p_user_id uuid,
  p_limit integer
)
returns table (
  allowed boolean,
  new_count integer
)
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set
    packets_used_this_month = case
      when packets_reset_date < date_trunc('month', now())::date then 1
      else packets_used_this_month + 1
    end,
    packets_reset_date = date_trunc('month', now())::date
  where id = p_user_id
    and (
      p_limit is null
      or (
        case
          when packets_reset_date < date_trunc('month', now())::date then 0
          else packets_used_this_month
        end
      ) < p_limit
    )
  returning true as allowed, packets_used_this_month as new_count;
$$;

revoke all on function public.check_and_increment_packet_usage(uuid, integer) from public;
revoke execute on function public.check_and_increment_packet_usage(uuid, integer) from anon, authenticated;
grant execute on function public.check_and_increment_packet_usage(uuid, integer) to service_role;

create or replace function public.decrement_packet_usage(p_user_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set packets_used_this_month = greatest(packets_used_this_month - 1, 0)
  where id = p_user_id;
$$;

revoke all on function public.decrement_packet_usage(uuid) from public;
revoke execute on function public.decrement_packet_usage(uuid) from anon, authenticated;
grant execute on function public.decrement_packet_usage(uuid) to service_role;
