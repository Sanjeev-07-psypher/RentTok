-- 0009_v1_batch.sql
-- Batch of v1 refinements:
--   * Item 2  — room BHK replaces single/shared as the primary descriptor
--   * Item 9  — house rules move up to the building (rooms inherit)
--   * Item 12 — owners can deactivate/reactivate a building or room
--   * Item 6  — user feedback for the developers
-- Additive + idempotent: safe to re-run.

-- --------------------------------------------------------------------------
-- Item 2: room BHK. Old rows keep their `type`; new rows use `bhk`.
-- `type` is no longer required (NULL passes the existing CHECK constraint).
-- --------------------------------------------------------------------------
alter table public.rooms add column if not exists bhk integer check (bhk is null or bhk >= 1);
alter table public.rooms alter column type drop not null;

-- --------------------------------------------------------------------------
-- Item 9: house rules on the building (a room inherits its building's rules).
-- --------------------------------------------------------------------------
alter table public.buildings add column if not exists rules text;

-- --------------------------------------------------------------------------
-- Item 12: soft active/inactive flag. Owner can pause a listing without
-- deleting it. Defaults to true so every existing listing stays live.
-- --------------------------------------------------------------------------
alter table public.buildings add column if not exists active boolean not null default true;
alter table public.rooms     add column if not exists active boolean not null default true;

-- Deactivated buildings drop out of public read. Owner + admin policies still
-- apply, so owners keep seeing their own paused listings in the dashboard.
drop policy if exists "buildings public read" on public.buildings;
create policy "buildings public read" on public.buildings
  for select using (status = 'approved' and active);

-- --------------------------------------------------------------------------
-- Item 6: feedback for the RentTok team. Anyone (signed in or not) can submit;
-- only admins can read. user_id is captured when available.
-- --------------------------------------------------------------------------
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  name       text,
  category   text,
  message    text not null,
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

drop policy if exists "feedback insert any" on public.feedback;
drop policy if exists "feedback admin read" on public.feedback;
create policy "feedback insert any" on public.feedback for insert with check (true);
create policy "feedback admin read" on public.feedback for select using (public.is_admin());

create index if not exists feedback_created_idx on public.feedback(created_at desc);
