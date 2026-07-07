-- 0007_reviews.sql
-- Reviews, written only by tenants with a confirmed booking for the room.
-- Additive + idempotent. Run AFTER 0006_room_units.sql.

create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  room_id     uuid not null references public.rooms(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  body        text,
  created_at  timestamptz not null default now(),
  unique (user_id, room_id)
);
create index if not exists reviews_building_idx on public.reviews(building_id, created_at desc);
create index if not exists reviews_room_idx on public.reviews(room_id);

alter table public.reviews enable row level security;
-- Public read; writes go ONLY through the server action (service role) which first
-- verifies the reviewer has a confirmed booking — so no client insert/update policy.
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews for select using (true);
