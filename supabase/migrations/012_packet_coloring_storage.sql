-- Coloring image backfill, step 1: packet-coloring-pages Storage bucket.
-- Public, same reasoning as packet-mascots (008): a coloring page scene goes
-- through the same scrubChildName IP guard before it reaches the image
-- model (see lib/generateMascotImage.ts's generateColoringImage), so it
-- carries no child name or other identifying content. Public reads mean no
-- signed-URL expiry to manage, same as the mascot bucket.
--
-- Path scheme: `${userId}/${packetId}.png`, matching both existing buckets'
-- shape — the userId segment carries no access-control meaning for reads
-- here (public-bucket reads bypass RLS via Storage's dedicated public
-- object endpoint), only writes go through RLS.
--
-- file_size_limit 5MB: the largest decoded coloring image observed in the
-- backfill audit was ~2.2MB, so this leaves comfortable headroom — same
-- limit as packet-mascots.
--
-- All four policies (select/insert/update/delete) from the start, unlike
-- 008's mascot bucket which shipped with only insert/update/delete and
-- broke every upload with 42501 until 009 added select. Root cause (see
-- 009's own comment): Storage's upload() always compiles to
--   INSERT ... ON CONFLICT (name, bucket_id) DO UPDATE ... RETURNING *
-- and Postgres RLS requires a matching SELECT policy for any row a DML
-- statement returns via RETURNING, independent of the bucket's `public`
-- flag. Do not re-derive this — include select from the start.

insert into storage.buckets (id, name, public, file_size_limit)
values ('packet-coloring-pages', 'packet-coloring-pages', true, 5242880) -- public; 5MB cap (largest observed ~2.2MB)
on conflict (id) do nothing;

create policy "packet-coloring-pages storage: owner can select"
  on storage.objects for select
  using (bucket_id = 'packet-coloring-pages' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "packet-coloring-pages storage: owner can insert"
  on storage.objects for insert
  with check (bucket_id = 'packet-coloring-pages' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "packet-coloring-pages storage: owner can update"
  on storage.objects for update
  using (bucket_id = 'packet-coloring-pages' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "packet-coloring-pages storage: owner can delete"
  on storage.objects for delete
  using (bucket_id = 'packet-coloring-pages' and auth.uid()::text = (storage.foldername(name))[1]);
