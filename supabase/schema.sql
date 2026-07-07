-- rent-tok schema + Row Level Security
-- Run in Supabase SQL editor (or `supabase db push`). Safe to re-run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  phone       text,
  avatar_url  text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.rooms (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  type          text not null check (type in ('single','shared','pg','hostel','flat')),
  description   text,
  area          text not null,
  address       text not null,
  city          text not null default 'Gangtok',
  lat           double precision,
  lng           double precision,
  rent          integer not null check (rent >= 0),
  deposit       integer not null default 0 check (deposit >= 0),
  rules         text,
  amenities     text[] not null default '{}',
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  rating        numeric(2,1),
  review_count  integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists rooms_status_idx on public.rooms(status);
create index if not exists rooms_area_idx   on public.rooms(area);
create index if not exists rooms_owner_idx  on public.rooms(owner_id);

create table if not exists public.room_photos (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  url         text not null,
  sort_order  integer not null default 0
);
create index if not exists room_photos_room_idx on public.room_photos(room_id);

create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references public.rooms(id) on delete cascade,
  tenant_id   uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'queued' check (status in ('queued','accepted','rejected','cancelled')),
  message     text,
  created_at  timestamptz not null default now()
);
create index if not exists bookings_room_idx   on public.bookings(room_id);
create index if not exists bookings_tenant_idx on public.bookings(tenant_id);

create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  booking_id          uuid not null references public.bookings(id) on delete cascade,
  user_id             uuid not null references public.profiles(id) on delete cascade,
  amount_paise        integer not null,
  status              text not null default 'created' check (status in ('created','paid','failed')),
  razorpay_order_id   text,
  razorpay_payment_id text,
  created_at          timestamptz not null default now()
);
create index if not exists payments_user_idx on public.payments(user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: is the current user an admin? SECURITY DEFINER avoids RLS recursion.
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles    enable row level security;
alter table public.rooms       enable row level security;
alter table public.room_photos enable row level security;
alter table public.bookings    enable row level security;
alter table public.payments    enable row level security;

-- profiles
drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles admin read"  on public.profiles;
drop policy if exists "profiles self upsert" on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles admin read"  on public.profiles for select using (public.is_admin());
-- Room owners can see the contact details of tenants who requested their rooms.
drop policy if exists "profiles owner-of-booking read" on public.profiles;
create policy "profiles owner-of-booking read" on public.profiles for select using (
  exists (
    select 1 from public.bookings b
    join public.rooms r on r.id = b.room_id
    where b.tenant_id = profiles.id and r.owner_id = auth.uid()
  )
);
create policy "profiles self upsert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

-- rooms
drop policy if exists "rooms public read"   on public.rooms;
drop policy if exists "rooms owner read"    on public.rooms;
drop policy if exists "rooms admin read"    on public.rooms;
drop policy if exists "rooms owner insert"  on public.rooms;
drop policy if exists "rooms owner update"  on public.rooms;
drop policy if exists "rooms admin update"  on public.rooms;
create policy "rooms public read"  on public.rooms for select using (status = 'approved');
create policy "rooms owner read"   on public.rooms for select using (auth.uid() = owner_id);
create policy "rooms admin read"   on public.rooms for select using (public.is_admin());
create policy "rooms owner insert" on public.rooms for insert with check (auth.uid() = owner_id);
create policy "rooms owner update" on public.rooms for update using (auth.uid() = owner_id);
create policy "rooms admin update" on public.rooms for update using (public.is_admin());

-- room_photos
drop policy if exists "photos public read"  on public.room_photos;
drop policy if exists "photos owner all"    on public.room_photos;
create policy "photos public read" on public.room_photos for select using (
  exists (select 1 from public.rooms r where r.id = room_id and (r.status = 'approved' or r.owner_id = auth.uid()))
);
create policy "photos owner all" on public.room_photos for all using (
  exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
) with check (
  exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
);

-- bookings
drop policy if exists "bookings tenant read" on public.bookings;
drop policy if exists "bookings owner read"  on public.bookings;
drop policy if exists "bookings admin read"  on public.bookings;
drop policy if exists "bookings owner update" on public.bookings;
drop policy if exists "bookings tenant cancel" on public.bookings;
create policy "bookings tenant read" on public.bookings for select using (auth.uid() = tenant_id);
create policy "bookings owner read"  on public.bookings for select using (
  exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
);
create policy "bookings admin read"  on public.bookings for select using (public.is_admin());
create policy "bookings owner update" on public.bookings for update using (
  exists (select 1 from public.rooms r where r.id = room_id and r.owner_id = auth.uid())
);
create policy "bookings tenant cancel" on public.bookings for update using (auth.uid() = tenant_id);
-- NOTE: booking INSERTs happen server-side via the service role after a verified
-- payment, so no anon insert policy is granted.

-- payments
drop policy if exists "payments self read"  on public.payments;
drop policy if exists "payments admin read" on public.payments;
create policy "payments self read"  on public.payments for select using (auth.uid() = user_id);
create policy "payments admin read" on public.payments for select using (public.is_admin());
-- payment INSERTs are service-role only.

-- ---------------------------------------------------------------------------
-- Storage bucket for room photos (public read, owner write)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('room-photos', 'room-photos', true)
on conflict (id) do nothing;

drop policy if exists "room photos public read"   on storage.objects;
drop policy if exists "room photos auth upload"    on storage.objects;
drop policy if exists "room photos owner delete"   on storage.objects;
create policy "room photos public read" on storage.objects
  for select using (bucket_id = 'room-photos');
create policy "room photos auth upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'room-photos');
create policy "room photos owner delete" on storage.objects
  for delete to authenticated using (bucket_id = 'room-photos' and owner = auth.uid());
