-- =============================================================================
-- Packet Day — Email sequence foundation
-- Migration: 015_email_sequence_foundation.sql
-- =============================================================================
--
-- Phase 1 of the welcome/nurture email sequence. This migration only lays
-- the foundation: the send ledger and the profile columns the sequence
-- needs to read and write. No cron, no send logic, no RPCs — those are
-- later phases.
--
-- ─── email_sends ────────────────────────────────────────────────────────────
--
-- One row per email actually attempted for a user. The unique constraint on
-- (user_id, email_key) is the entire dedupe guarantee — the database
-- rejects a second attempt at the same email for the same user outright,
-- rather than relying on a file or an in-memory check (see the retired
-- scripts/send-packet-back-email.ts prototype, which used a local JSON
-- file — that approach cannot survive on Vercel's ephemeral filesystem and
-- is not what any part of this build should copy).
--
-- email_key is a free-form slug chosen by the caller, e.g. "welcome" for a
-- one-time email, or "packet_back_2026_10" for a recurring monthly email
-- that needs a fresh key each period so later months aren't blocked by the
-- unique constraint.
--
-- No retries: status is 'sent' or 'failed' and stays that way. A failed
-- attempt still gets a row (so it counts against the unique constraint and
-- is visible), with the error message captured for debugging.
--
-- RLS is enabled with zero policies for anon or authenticated — this table
-- is service-role only, the same posture as check_and_increment_packet_usage
-- (migration 006). service_role bypasses RLS entirely, so no policy is
-- needed or added for it.

create table public.email_sends (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles on delete cascade,
  email_key   text not null,
  status      text not null check (status in ('sent', 'failed')),
  resend_id   text,
  error       text,
  created_at  timestamptz not null default now(),
  unique (user_id, email_key)
);

comment on table public.email_sends is
  'One row per email send attempt. Unique (user_id, email_key) is the sole dedupe guarantee — an email is never sent twice to the same user under the same key. Service role only.';

alter table public.email_sends enable row level security;

-- No policies for anon/authenticated on purpose — service role only.

-- ─── profiles columns ───────────────────────────────────────────────────────
--
-- marketing_opt_out: set true by the (later-phase) signed-token unsubscribe
-- link. Once true, the cron must never send this user anything from the
-- sequence again.
--
-- last_cap_hit_at: written by app/api/generate-packet/route.ts's existing
-- 403 limit_reached block, alongside its existing track("limit_reached")
-- call. Deliberately NOT written inside check_and_increment_packet_usage —
-- that function is left untouched.
--
-- sequence_started_at: stamped by app/auth/confirm/route.ts right before
-- the (later-phase) Email 1 send attempt, so "Day N" of the sequence counts
-- from actual email confirmation, not from signup. The hourly cron's
-- backstop query is then a plain check of "sequence_started_at is set, but
-- no matching email_sends row" — no auth.users access and no
-- supabase.auth.admin calls needed for the ongoing job.

alter table public.profiles
  add column marketing_opt_out  boolean not null default false,
  add column last_cap_hit_at    timestamptz,
  add column sequence_started_at timestamptz;

comment on column public.profiles.marketing_opt_out is
  'Set by the signed-token unsubscribe link. Once true, the email sequence must never send this user anything again.';

comment on column public.profiles.last_cap_hit_at is
  'Timestamp of the most recent time this user hit their free-packet cap (403 limit_reached in app/api/generate-packet/route.ts). Null if never hit.';

comment on column public.profiles.sequence_started_at is
  'Timestamp this user''s email sequence began — stamped in app/auth/confirm/route.ts right before the Email 1 send attempt, so sequence day-N counts from email confirmation, not signup.';
