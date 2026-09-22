-- =============================================================================
-- Packet Day — email_sends: add 'pending' status
-- Migration: 016_email_sends_pending_status.sql
-- =============================================================================
--
-- Phase 4 (the sequence engine, lib/emailSends.ts) claims a send by
-- inserting a 'pending' row into email_sends BEFORE calling Resend, then
-- updates that row to 'sent' or 'failed' afterward. The insert itself,
-- protected by the existing unique (user_id, email_key) constraint from
-- migration 015, is the atomic claim -- a second concurrent or later
-- attempt at the same pair always loses the insert. This migration only
-- widens the status check constraint to allow 'pending'; no other schema
-- change, no RLS change (still service-role only, zero policies for
-- anon/authenticated, per migration 015).

alter table public.email_sends drop constraint email_sends_status_check;

alter table public.email_sends add constraint email_sends_status_check
  check (status in ('pending', 'sent', 'failed'));

comment on constraint email_sends_status_check on public.email_sends is
  'pending is the claim state between the insert and the Resend call; sent/failed are terminal. No retries -- see the table comment.';
