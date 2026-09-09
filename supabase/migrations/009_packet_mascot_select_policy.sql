-- Fixes the mascot upload failure introduced in 008: every upload to the
-- "packet-mascots" bucket failed with 42501 ("new row violates row-level
-- security policy"), even though the INSERT policy's own WITH CHECK was
-- correct and passing in isolation.
--
-- Root cause, confirmed by direct reproduction (see chunk 4 diagnosis):
-- Supabase Storage's upload() call always compiles to
--   INSERT ... ON CONFLICT (name, bucket_id) DO UPDATE ... RETURNING *
-- and Postgres RLS requires a matching SELECT policy for any row a DML
-- statement returns via RETURNING — independent of the bucket's `public`
-- flag. 008's comment reasoned that public-bucket reads bypass RLS via
-- Storage's dedicated `/object/public/...` endpoint, which is true for
-- anonymous GET requests, but does not extend to what Postgres itself
-- requires internally for RETURNING on the authenticated-role write path.
-- That gap is why 008 shipped with no SELECT policy on this bucket.
--
-- Confirmed directly: the identical INSERT succeeds with RETURNING removed,
-- and fails with it present, even when the INSERT policy is replaced with an
-- unconditional `with check (true)` — proving the INSERT policy was never
-- the problem. Do not re-derive this — any future write-enabled bucket
-- needs a SELECT policy regardless of whether it's public or private.

create policy "packet-mascots storage: owner can select"
  on storage.objects for select
  using (bucket_id = 'packet-mascots' and auth.uid()::text = (storage.foldername(name))[1]);
