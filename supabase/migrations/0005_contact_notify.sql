-- 0005_contact_notify.sql
-- A contact phone per building (so admin can call to verify ownership) and an
-- owner-facing notifications inbox (so listing approve/reject is acknowledged).
-- Additive and idempotent. Run AFTER 0004_security.sql.

alter table public.buildings add column if not exists contact_phone text;

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,            -- listing_approved | listing_rejected | ...
  title      text not null,
  body       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;
-- Owners read & mark-read their own; inserts are service-role only (admin actions).
drop policy if exists "notifications self read"   on public.notifications;
drop policy if exists "notifications self update" on public.notifications;
create policy "notifications self read"   on public.notifications for select using (auth.uid() = user_id);
create policy "notifications self update" on public.notifications for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
