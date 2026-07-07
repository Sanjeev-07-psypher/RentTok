-- 0002_identity.sql
-- Aadhaar identity verification (owners + tenants) and the private document bucket.
-- Additive and idempotent — safe to re-run. Run AFTER 0001_buildings.sql.
--
-- Privacy model: the raw Aadhaar image lives in a PRIVATE bucket reachable only
-- via short-lived service-role signed URLs. We persist only a masked last-4 and a
-- status; the admin verifies manually and the raw image is DELETED after review.

-- ---------------------------------------------------------------------------
-- profiles: verification columns
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists aadhaar_status text not null default 'none'
  check (aadhaar_status in ('none', 'pending', 'verified', 'rejected'));
alter table public.profiles add column if not exists aadhaar_last4 text;
alter table public.profiles add column if not exists aadhaar_path text;          -- storage object path; cleared after review
alter table public.profiles add column if not exists aadhaar_submitted_at timestamptz;
alter table public.profiles add column if not exists aadhaar_reviewed_at timestamptz;

create index if not exists profiles_aadhaar_status_idx on public.profiles(aadhaar_status);

-- ---------------------------------------------------------------------------
-- Private storage bucket for Aadhaar documents (NO public read)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('aadhaar-docs', 'aadhaar-docs', false)
on conflict (id) do update set public = false;

-- A user may upload only into their own uid-prefixed folder. There is deliberately
-- NO select policy → the bucket is unreadable by anon/authenticated clients; the
-- admin reads it through the service-role client (which bypasses RLS) via signed URLs.
drop policy if exists "aadhaar owner upload" on storage.objects;
drop policy if exists "aadhaar owner delete" on storage.objects;
create policy "aadhaar owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'aadhaar-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "aadhaar owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'aadhaar-docs' and (storage.foldername(name))[1] = auth.uid()::text);
