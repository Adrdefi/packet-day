-- =============================================================================
-- Packet Day — client_request_id for iOS generation-recovery
-- Migration: 013_packet_client_request_id.sql
-- =============================================================================
--
-- The generate flow holds a long-lived SSE connection open for the full
-- ~60-110s of generation. iOS Safari suspends/kills that connection when the
-- phone locks or the tab backgrounds, and the client throws a native
-- "Load failed" error even though the server runs the request to completion
-- and the packet is saved successfully. app/generate/page.tsx needs a way to
-- ask "did the request I just started actually produce a packet?" after a
-- disconnect, matched exactly rather than fuzzily by child+theme+recency.
--
-- client_request_id is generated client-side with crypto.randomUUID() when
-- generation starts, sent in the POST body, and stored on the row at insert
-- time in app/api/generate-packet/route.ts. Nullable, no default: older
-- cached client bundles that don't send it must still insert successfully,
-- and every pre-existing row is unaffected.
--
-- No index: lookups are always scoped by the existing "packets: owner can
-- select" RLS policy (auth.uid() = user_id) first, which already narrows to
-- one user's own packets — a handful of rows even for a heavy user. Adding
-- an index for that residual scan isn't justified.

alter table public.packets
  add column client_request_id uuid;

comment on column public.packets.client_request_id is
  'Client-generated uuid (crypto.randomUUID()) sent with the generate request. Used to recover a packet after the client loses its SSE connection (e.g. iOS backgrounding) without needing a fuzzy child+theme+recency match. Nullable — older clients omit it.';
