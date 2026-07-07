-- 0006_room_units.sql
-- A room becomes a TYPE with a quantity of identical units ("Single Room ×3"),
-- and tenants store one-time personal details. Additive + idempotent.
-- Run AFTER 0005_contact_notify.sql.

-- Room = a type with N identical units. available_units = total_units − booked_units.
-- booked_units is incremented by the confirm action (service role) and is publicly
-- readable, so availability is correct for anonymous viewers without reading bookings.
alter table public.rooms add column if not exists total_units integer not null default 1
  check (total_units >= 1);
alter table public.rooms add column if not exists booked_units integer not null default 0
  check (booked_units >= 0);

-- Backfill booked_units from existing confirmed bookings (safe to re-run).
update public.rooms r
set booked_units = sub.cnt
from (select room_id, count(*)::int as cnt from public.bookings where status = 'confirmed' group by room_id) sub
where sub.room_id = r.id and r.booked_units <> sub.cnt;

-- One-time tenant details (full_name + phone already exist on profiles).
alter table public.profiles add column if not exists age integer check (age is null or (age >= 16 and age <= 120));
alter table public.profiles add column if not exists permanent_address text;
alter table public.profiles add column if not exists guardian_name text;
alter table public.profiles add column if not exists guardian_phone text;
