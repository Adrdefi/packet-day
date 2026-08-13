-- =============================================================================
-- Packet Day — Revoke public EXECUTE on internal/administrative functions
-- Migration: 004_revoke_public_function_execute.sql
-- =============================================================================
--
-- Supabase's security linter flagged four SECURITY DEFINER functions in the
-- public schema as callable over the REST API (PostgREST RPC) by the anon and
-- authenticated roles. They ended up that way because Supabase grants EXECUTE
-- on every new public-schema function to anon and authenticated by default
-- unless it is explicitly revoked — none of these three ever had that default
-- revoked. increment_packet_view is the fourth flagged function; it is
-- intentionally public and is left untouched.

-- ─── reset_monthly_packet_counts() ─────────────────────────────────────────────
-- Maintenance function (returns void, not a trigger) — genuinely callable via
-- RPC today. This is the priority fix: an unauthenticated caller with only the
-- publishable anon key could invoke it directly and zero out every user's
-- packets_used_this_month on demand, bypassing the free-tier quota and driving
-- unbounded Anthropic/Replicate spend.
revoke execute on function public.reset_monthly_packet_counts() from anon, authenticated;

-- ─── rls_auto_enable() ──────────────────────────────────────────────────────────
-- Handler for the live "ensure_rls" event trigger (returns event_trigger).
-- Postgres refuses direct invocation of event-trigger-typed functions outside
-- the event-trigger mechanism, so this grant was not actually exploitable —
-- but it should never have existed. Revoking it clears the linter finding
-- without touching the event trigger itself.
revoke execute on function public.rls_auto_enable() from anon, authenticated;

-- ─── handle_new_user() ───────────────────────────────────────────────────────────
-- Handler for the on_auth_user_created trigger (returns trigger). Postgres
-- refuses direct invocation of trigger-typed functions outside the trigger
-- mechanism, so this grant was likewise inert — but should not have existed.
revoke execute on function public.handle_new_user() from anon, authenticated;

-- ─── increment_packet_view(uuid) ────────────────────────────────────────────────
-- Intentionally public. Powers the anonymous view counter on shared packet
-- pages via app/api/packets/[packetId]/view/route.ts. No change — left here
-- only as a marker that it was reviewed, not skipped.

-- ─── set_updated_at() ────────────────────────────────────────────────────────────
-- Trigger handler with no explicit search_path. Not SECURITY DEFINER, so the
-- risk is lower than the functions above, but pin it for consistency with the
-- other trigger functions and to close the linter's "Function Search Path
-- Mutable" finding.
alter function public.set_updated_at() set search_path = public;
