-- Chunk 4 (mascot email image): packet-mascots Storage bucket.
-- Public, unlike the "packets" PDF bucket — a mascot illustration carries no
-- child name or other identifying content, unlike the PDF (which has the
-- child's real name in its filename and on every printed page). Public reads
-- mean no signed-URL expiry to manage for an email image that may sit unread
-- for weeks.
--
-- Path scheme: `${userId}/${packetId}.png`, matching the "packets" bucket's
-- shape for consistency — though here the userId segment carries no
-- access-control meaning, since public-bucket reads bypass RLS entirely via
-- Storage's dedicated public object endpoint. Only writes go through RLS.

insert into storage.buckets (id, name, public, file_size_limit)
values ('packet-mascots', 'packet-mascots', true, 5242880) -- public; 5MB cap (real mascots run ~500-650KB)
on conflict (id) do nothing;

create policy "packet-mascots storage: owner can insert"
  on storage.objects for insert
  with check (bucket_id = 'packet-mascots' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "packet-mascots storage: owner can update"
  on storage.objects for update
  using (bucket_id = 'packet-mascots' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "packet-mascots storage: owner can delete"
  on storage.objects for delete
  using (bucket_id = 'packet-mascots' and auth.uid()::text = (storage.foldername(name))[1]);
