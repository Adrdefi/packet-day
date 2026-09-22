-- =============================================================================
-- Packet Day — Per-packet AI cost ledger
-- Migration: 017_packet_ai_usage.sql
-- =============================================================================
--
-- One row per successfully saved packet, recording what that packet actually
-- cost to make: Claude's real token usage (straight from the API response,
-- not estimated), and how many Replicate attempts each image took.
--
-- Written by app/api/generate-packet/route.ts with the service role client,
-- after images finish and before the "complete" event. The write is
-- best-effort — a failure here is logged and never fails generation.
--
-- est_cost_usd is computed in app code from the price table in lib/config.ts
-- at the time of the insert. Every image attempt is counted as billed,
-- including a timed-out attempt whose output we never used (Replicate keeps
-- running and bills it). Null if the Claude model isn't in the price table.
--
-- Packets whose Claude call fails before the packet is saved get no row —
-- there is no packet_id to hang it on. That spend is not captured here.
--
-- unique (packet_id): exactly one cost row per packet.
--
-- RLS: users can read their own rows. No insert/update/delete policy for
-- anon or authenticated — only service_role (which bypasses RLS) writes.

create table public.packet_ai_usage (
  id                    uuid primary key default gen_random_uuid(),
  packet_id             uuid not null unique references public.packets on delete cascade,
  user_id               uuid not null references public.profiles on delete cascade,
  created_at            timestamptz not null default now(),
  claude_model          text not null,
  input_tokens          integer not null,
  output_tokens         integer not null,
  cache_read_tokens     integer not null default 0,
  cache_write_tokens    integer not null default 0,
  claude_duration_ms    integer not null,
  mascot_model          text,
  mascot_attempts       integer not null default 0,
  mascot_duration_ms    integer,
  coloring_model        text,
  coloring_attempts     integer not null default 0,
  coloring_duration_ms  integer,
  est_cost_usd          numeric(10, 6)
);

comment on table public.packet_ai_usage is
  'One row per saved packet: real Claude token usage and Replicate attempt counts, plus an estimated USD cost from lib/config.ts prices. Service role writes; users read their own rows.';

comment on column public.packet_ai_usage.mascot_duration_ms is
  'Duration of the successful Replicate call only. Null if every attempt failed or image generation was skipped.';

comment on column public.packet_ai_usage.coloring_duration_ms is
  'Duration of the successful Replicate call only. Null if every attempt failed or image generation was skipped.';

create index packet_ai_usage_user_id_idx on public.packet_ai_usage (user_id);

alter table public.packet_ai_usage enable row level security;

create policy "Users can read their own AI usage"
  on public.packet_ai_usage for select
  to authenticated
  using ((select auth.uid()) = user_id);
