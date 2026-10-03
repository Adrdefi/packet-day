-- Packet Day — table grants and storage file types
-- Migration: 020_table_grants_and_bucket_types.sql
--
-- Storage buckets accept only the file types the app writes: PNG, JPEG and
-- WebP images for mascots and coloring pages, PDF for packets.
--
-- email_leads and referrals are not written by the app, so their insert
-- policies are removed. The tables and their rows are untouched.
--
-- anon never writes to a public table (signup rows come from the
-- handle_new_user trigger, everything else from signed-in users or the
-- service role), so it keeps read access only.

update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id in ('packet-mascots', 'packet-coloring-pages');

update storage.buckets
set allowed_mime_types = array['application/pdf']
where id = 'packets';

drop policy if exists "email_leads: anyone can insert" on public.email_leads;

drop policy if exists "referrals: authenticated can insert" on public.referrals;

revoke insert, update, delete on
  public.children,
  public.email_leads,
  public.email_sends,
  public.packet_ai_usage,
  public.packets,
  public.profiles,
  public.referrals
from anon;
