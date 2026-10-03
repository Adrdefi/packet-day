-- Packet Day — packet write grants
-- Migration: 021_packet_write_grants.sql
--
-- Packet rows and packet images are written server side
-- (app/api/generate-packet, service role). Signed-in users may only record
-- their own PDF's storage path (lib/packetPdfRender.ts), and RLS still
-- limits that to their own rows.

revoke insert, update on public.packets from authenticated;

grant update (pdf_url) on public.packets to authenticated;

-- Mascot and coloring page uploads run with the service role, so signed-in
-- users no longer write to those buckets. Their read policies stay.
drop policy if exists "packet-mascots storage: owner can insert" on storage.objects;
drop policy if exists "packet-mascots storage: owner can update" on storage.objects;
drop policy if exists "packet-mascots storage: owner can delete" on storage.objects;
drop policy if exists "packet-coloring-pages storage: owner can insert" on storage.objects;
drop policy if exists "packet-coloring-pages storage: owner can update" on storage.objects;
drop policy if exists "packet-coloring-pages storage: owner can delete" on storage.objects;

-- anon keeps read access only.
revoke truncate on
  public.children,
  public.email_leads,
  public.email_sends,
  public.packet_ai_usage,
  public.packets,
  public.referrals
from anon;
