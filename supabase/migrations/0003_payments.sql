-- 0003_payments.sql
-- The ₹30 booking-fee queue with two-sided confirmation + percentage refunds,
-- refund bookkeeping on payments, and an append-only events log for full admin
-- visibility. Additive and idempotent. Run AFTER 0002_identity.sql.

-- ---------------------------------------------------------------------------
-- bookings: richer lifecycle
--   queued → accepted → confirmed            (happy path)
--                     ↘ cancelled | rejected (85% refund)
--   any queued/accepted → refunded           (100% refund once room is taken)
-- ---------------------------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('queued','accepted','rejected','cancelled','confirmed','refunded'));

alter table public.bookings add column if not exists confirmed_by_owner  boolean not null default false;
alter table public.bookings add column if not exists confirmed_by_tenant boolean not null default false;
alter table public.bookings add column if not exists queue_position integer;
alter table public.bookings add column if not exists cancelled_by text check (cancelled_by in ('owner','tenant','system'));
alter table public.bookings add column if not exists confirmed_at timestamptz;

-- ---------------------------------------------------------------------------
-- payments: refund bookkeeping (refunds recorded on the original fee row)
-- ---------------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('created','paid','failed','refund_pending','refunded','partially_refunded'));

alter table public.payments add column if not exists type text not null default 'booking_fee'
  check (type in ('booking_fee','refund'));
alter table public.payments add column if not exists razorpay_refund_id text;
alter table public.payments add column if not exists amount_refunded_paise integer not null default 0;
alter table public.payments add column if not exists refunded_at timestamptz;

create index if not exists payments_booking_idx on public.payments(booking_id);

-- Idempotency: one fee row per Razorpay payment (blocks replay of a captured payment).
create unique index if not exists payments_rzp_payment_uniq
  on public.payments(razorpay_payment_id) where razorpay_payment_id is not null;

-- At most one ACTIVE request per (room, tenant) — prevents duplicate queue entries.
create unique index if not exists bookings_active_uniq
  on public.bookings(room_id, tenant_id) where status in ('queued','accepted');

-- ---------------------------------------------------------------------------
-- events: append-only audit log of everything the admin may need to rectify
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  type       text not null,                 -- e.g. booking_created, booking_confirmed, refund_issued
  actor_id   uuid,                          -- who triggered it (nullable for system)
  entity     text,                          -- 'booking' | 'payment' | 'building' | 'profile'
  entity_id  uuid,
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists events_created_idx on public.events(created_at desc);
create index if not exists events_type_idx on public.events(type);

alter table public.events enable row level security;
-- Admin-only read; inserts are service-role only (no insert policy).
drop policy if exists "events admin read" on public.events;
create policy "events admin read" on public.events for select using (public.is_admin());
