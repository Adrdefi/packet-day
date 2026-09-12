-- Applied to the live database on 2026-09-12, recorded here so a fresh
-- rebuild matches production.
--
-- The "packets: public share read" policy from 001_initial_schema.sql used
-- (share_token is not null), which is true for every row, so it granted anon
-- SELECT on the entire packets table rather than on a single shared packet.
-- The share page now reads through get_packet_by_share_token() from migration
-- 010, so nothing depends on this policy.

drop policy if exists "packets: public share read" on public.packets;
