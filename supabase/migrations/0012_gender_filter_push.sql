-- 0012_gender_filter_push.sql
--   * Item 4 — buildings.for_gender (boys-only / girls-only filter, mainly PG & hostel)
--   * Item 5 — notifications.link (deep-link a notification to the relevant page)
--   * Item 6 — push_subscriptions (Web Push / Chrome notifications)
-- Additive + idempotent.

-- Item 4: who the building is for.
alter table public.buildings add column if not exists for_gender text
  check (for_gender is null or for_gender in ('any', 'boys', 'girls')) default 'any';

-- Item 5: where clicking a notification should take the user.
alter table public.notifications add column if not exists link text;

-- Item 6: Web Push subscriptions (one row per browser/device per user).
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push self all" on public.push_subscriptions;
create policy "push self all" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists push_user_idx on public.push_subscriptions(user_id);
