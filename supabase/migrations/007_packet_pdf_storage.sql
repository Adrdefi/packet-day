-- Chunk 2: packet PDF storage.
-- Creates the "packets" Storage bucket (private) referenced by
-- app/api/generate-pdf/route.ts, which has existed in code since the PDF
-- route was written but was never actually created — every upload has been
-- silently failing, and pdf_url has been null on every packet ever generated.

insert into storage.buckets (id, name, public, file_size_limit)
values ('packets', 'packets', false, 10485760) -- private; 10MB cap (real PDFs run ~1.2-1.8MB)
on conflict (id) do nothing;

-- Owner-scoped RLS, mirroring the "packets" table policy pattern (auth.uid() =
-- user_id) but keyed off the object path's first segment, since storage
-- objects are stored at `${user_id}/${packet.id}.pdf`.
--
-- IMPORTANT: these policies gate client-side (session-bound) access only.
-- A request made with the service-role key bypasses RLS entirely and can
-- read/write any object regardless of path. A later chunk reads these PDFs
-- back from a server context with no user session (service-role) — that read
-- is intentionally not covered by these policies and does not need to be.

create policy "packets storage: owner can select"
  on storage.objects for select
  using (bucket_id = 'packets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "packets storage: owner can insert"
  on storage.objects for insert
  with check (bucket_id = 'packets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "packets storage: owner can update"
  on storage.objects for update
  using (bucket_id = 'packets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "packets storage: owner can delete"
  on storage.objects for delete
  using (bucket_id = 'packets' and auth.uid()::text = (storage.foldername(name))[1]);
