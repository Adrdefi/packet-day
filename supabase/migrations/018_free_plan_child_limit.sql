-- =============================================================================
-- Packet Day — Free plan: one child profile per account
-- Migration: 018_free_plan_child_limit.sql
-- =============================================================================
--
-- The free plan includes 1 child profile (pricing page, homepage pricing
-- section). Until now nothing enforced it: app/dashboard/children/new and
-- app/onboarding insert into public.children straight from the browser, and
-- the only guard was the "children: owner can insert" RLS policy, which
-- checks ownership, not count. So the limit has to live in the database;
-- any check in page code alone could be skipped by calling the API directly.
--
-- APPLY THIS RIGHT BEFORE MERGING preview/capped-state, not earlier. There is
-- one Supabase project for preview and production, and the live add-child
-- page from before that branch shows only a generic error if this refuses an
-- insert. The branch's add-child page recognizes child_limit_reached below
-- and explains it.
--
-- Plan status: profiles.subscription_status, the same field the whole app
-- reads for plan status, with the same rule as lib/isPaid.ts's
-- isPaidStatus(): exactly 'pro' is paid. 'free', 'cancelled', null or
-- anything unrecognized is the free plan.
--
-- Who it applies to: only requests made as the `authenticated` role, read
-- from the request's JWT claims. The service role, the postgres role
-- (migrations, SQL editor) and anything else without an authenticated JWT
-- are never blocked.
--
-- Existing accounts keep every profile they already have. Four free accounts
-- had 2 or 3 children when this was written; this trigger only runs on
-- INSERT, so they keep them all and simply can't add more. An account that
-- cancels Unlimited likewise keeps its profiles.
--
-- Two quick inserts at once (double tap) could otherwise both see 0 existing
-- children, so the check takes a per-user transaction lock first.
--
-- SECURITY INVOKER (the default), not DEFINER: the check runs with the
-- caller's own RLS view, which is exactly the rows it needs (their own
-- profile and their own children). A trigger function can't be called
-- directly (Postgres refuses to run it outside a trigger), so the default
-- EXECUTE grants on it expose nothing; verify with pg_proc.proacl anyway
-- after applying, per CLAUDE.md.

create or replace function public.enforce_free_plan_child_limit()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  request_role text := coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
  plan_status text;
  existing_children integer;
begin
  if request_role <> 'authenticated' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('child_limit:' || new.user_id::text, 0));

  select subscription_status into plan_status
  from public.profiles
  where id = new.user_id;

  if plan_status = 'pro' then
    return new;
  end if;

  select count(*) into existing_children
  from public.children
  where user_id = new.user_id;

  if existing_children >= 1 then
    raise exception 'child_limit_reached'
      using errcode = 'P0001',
            hint = 'The free plan includes one child profile. Unlimited includes every kid.';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_free_plan_child_limit on public.children;

create trigger enforce_free_plan_child_limit
  before insert on public.children
  for each row
  execute function public.enforce_free_plan_child_limit();
