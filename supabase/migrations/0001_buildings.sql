-- 0001_buildings.sql
-- Introduce BUILDINGS as the parent of rooms (hostels/PGs have many similar rooms),
-- plus wishlist + recently-viewed history. Additive and idempotent — safe to re-run.
-- Run in the Supabase SQL editor (or `supabase db push`) AFTER schema.sql.

-- ---------------------------------------------------------------------------
-- 1. buildings — the property; a standalone place is just a 1-room building.
-- ---------------------------------------------------------------------------
create table if not exists public.buildings (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references public.profiles(id) on delete cascade,
  name               text not null,
  description        text,
  type               text not null default 'pg' check (type in ('pg','hostel','flat','house')),
  area               text not null,
  address            text not null,
  city               text not null default 'Gangtok',
  lat                double precision,
  lng                double precision,
  amenities          text[] not null default '{}',
  status             text not null default 'pending' check (status in ('pending','approved','rejected')),
  owner_verified     boolean not null default false,   -- admin called & confirmed ownership (Phase 2)
  owner_verified_at  timestamptz,
  rating             numeric(2,1),
  review_count       integer not null default 0,
  created_at         timestamptz not null default now()
);
create index if not exists buildings_status_idx on public.buildings(status);
create index if not exists buildings_area_idx   on public.buildings(area);
create index if not exists buildings_owner_idx  on public.buildings(owner_id);

-- ---------------------------------------------------------------------------
-- 2. rooms become units inside a building (additive: legacy location columns
--    on rooms are kept so the old room detail page keeps working).
-- ---------------------------------------------------------------------------
alter table public.rooms add column if not exists building_id uuid references public.buildings(id) on delete cascade;
alter table public.rooms add column if not exists availability text not null default 'available'
  check (availability in ('available','booked'));
create index if not exists rooms_building_idx on public.rooms(building_id);

-- ---------------------------------------------------------------------------
-- 3. building-level photo gallery
-- ---------------------------------------------------------------------------
create table if not exists public.building_photos (
  id          uuid primary key default gen_random_uuid(),
  building_id uuid not null references public.buildings(id) on delete cascade,
  url         text not null,
  sort_order  integer not null default 0
);
create index if not exists building_photos_building_idx on public.building_photos(building_id);

-- ---------------------------------------------------------------------------
-- 4. Migration: wrap every existing orphan room in its own 1-room building,
--    copying its location/amenities/status and lifting its photos to the gallery.
-- ---------------------------------------------------------------------------
do $$
declare r record; new_building uuid;
begin
  for r in select * from public.rooms where building_id is null loop
    insert into public.buildings
      (owner_id, name, description, type, area, address, city, lat, lng, amenities, status, rating, review_count, created_at)
    values (
      r.owner_id, r.title, r.description,
      case when r.type in ('pg','hostel','flat') then r.type else 'house' end,
      r.area, r.address, coalesce(r.city, 'Gangtok'), r.lat, r.lng,
      coalesce(r.amenities, '{}'), r.status, r.rating, r.review_count, r.created_at
    )
    returning id into new_building;

    update public.rooms set building_id = new_building where id = r.id;

    insert into public.building_photos (building_id, url, sort_order)
    select new_building, url, sort_order from public.room_photos where room_id = r.id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. wishlist + recently viewed (per-user, self-scoped)
-- ---------------------------------------------------------------------------
create table if not exists public.wishlists (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, building_id)
);

create table if not exists public.recently_viewed (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  building_id uuid not null references public.buildings(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  primary key (user_id, building_id)
);
create index if not exists recently_viewed_user_idx on public.recently_viewed(user_id, viewed_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.buildings       enable row level security;
alter table public.building_photos enable row level security;
alter table public.wishlists       enable row level security;
alter table public.recently_viewed enable row level security;

-- buildings (mirror the rooms policies)
drop policy if exists "buildings public read"  on public.buildings;
drop policy if exists "buildings owner read"   on public.buildings;
drop policy if exists "buildings admin read"   on public.buildings;
drop policy if exists "buildings owner insert" on public.buildings;
drop policy if exists "buildings owner update" on public.buildings;
drop policy if exists "buildings admin update" on public.buildings;
create policy "buildings public read"  on public.buildings for select using (status = 'approved');
create policy "buildings owner read"   on public.buildings for select using (auth.uid() = owner_id);
create policy "buildings admin read"   on public.buildings for select using (public.is_admin());
create policy "buildings owner insert" on public.buildings for insert with check (auth.uid() = owner_id);
create policy "buildings owner update" on public.buildings for update using (auth.uid() = owner_id);
create policy "buildings admin update" on public.buildings for update using (public.is_admin());

-- a room is publicly readable when its building is approved (supplements the
-- existing "rooms public read" on rooms.status)
drop policy if exists "rooms building public read" on public.rooms;
create policy "rooms building public read" on public.rooms for select using (
  exists (select 1 from public.buildings b where b.id = building_id and b.status = 'approved')
);

-- building_photos (mirror room_photos)
drop policy if exists "building photos public read" on public.building_photos;
drop policy if exists "building photos owner all"   on public.building_photos;
create policy "building photos public read" on public.building_photos for select using (
  exists (select 1 from public.buildings b where b.id = building_id and (b.status = 'approved' or b.owner_id = auth.uid()))
);
create policy "building photos owner all" on public.building_photos for all using (
  exists (select 1 from public.buildings b where b.id = building_id and b.owner_id = auth.uid())
) with check (
  exists (select 1 from public.buildings b where b.id = building_id and b.owner_id = auth.uid())
);

-- wishlists + recently_viewed (self only)
drop policy if exists "wishlist self all" on public.wishlists;
create policy "wishlist self all" on public.wishlists for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "recently viewed self all" on public.recently_viewed;
create policy "recently viewed self all" on public.recently_viewed for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage bucket for building photos (public read, owner write) — mirrors room-photos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('building-photos', 'building-photos', true)
on conflict (id) do nothing;

drop policy if exists "building photos public read obj" on storage.objects;
drop policy if exists "building photos auth upload"     on storage.objects;
drop policy if exists "building photos owner delete"    on storage.objects;
create policy "building photos public read obj" on storage.objects
  for select using (bucket_id = 'building-photos');
create policy "building photos auth upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'building-photos');
create policy "building photos owner delete" on storage.objects
  for delete to authenticated using (bucket_id = 'building-photos' and owner = auth.uid());
