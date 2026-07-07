-- 0008_calls.sql
-- Masked phone calls between owner and tenant (Exotel click-to-connect). Neither
-- party sees the other's real number; calls are recorded for admin. Additive +
-- idempotent. Run AFTER 0007_reviews.sql.

create table if not exists public.calls (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid references public.bookings(id) on delete set null,
  room_id       uuid references public.rooms(id) on delete set null,
  owner_id      uuid references public.profiles(id) on delete set null,
  tenant_id     uuid references public.profiles(id) on delete set null,
  initiated_by  text not null check (initiated_by in ('owner', 'tenant')),
  exotel_call_sid text,
  status        text not null default 'initiated'
    check (status in ('initiated','ringing','in-progress','completed','failed','no-answer','busy','canceled')),
  duration_sec  integer,
  recording_url text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists calls_booking_idx on public.calls(booking_id);
create index if not exists calls_created_idx on public.calls(created_at desc);
create index if not exists calls_sid_idx on public.calls(exotel_call_sid);

alter table public.calls enable row level security;
-- Admin reads everything; each participant can see their own call rows.
-- Inserts/updates are service-role only (call actions + Exotel webhook).
drop policy if exists "calls admin read" on public.calls;
drop policy if exists "calls participant read" on public.calls;
create policy "calls admin read" on public.calls for select using (public.is_admin());
create policy "calls participant read" on public.calls for select
  using (auth.uid() = owner_id or auth.uid() = tenant_id);
