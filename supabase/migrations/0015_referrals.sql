-- 0015_referrals.sql
-- Owner referrals → listing priority.
--   * Every user gets one permanent, unique referral code.
--   * A new owner may enter someone's code when creating their FIRST building.
--   * The referrer earns +1 point only once per referred owner, and only when
--     that owner's first building is approved by an admin.
--   * Every building of the referrer carries the referrer's points as
--     buildings.referral_score; the homepage sorts by it first.
-- Idempotent — safe to re-run. Run AFTER 0014_security_hardening.sql.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
alter table public.profiles  add column if not exists referral_code  text;
alter table public.profiles  add column if not exists referral_count integer not null default 0;
alter table public.buildings add column if not exists referral_score integer not null default 0;

create unique index if not exists profiles_referral_code_uniq on public.profiles(referral_code);
create index if not exists buildings_referral_score_idx on public.buildings(referral_score desc);

-- One row per referred owner (primary key = they can only ever be referred once).
create table if not exists public.referrals (
  referred_id uuid primary key references public.profiles(id) on delete cascade,
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  rewarded_at timestamptz,
  constraint referrals_not_self check (referred_id <> referrer_id)
);
create index if not exists referrals_referrer_idx on public.referrals(referrer_id);

alter table public.referrals enable row level security;
-- Writes are service-role only (server actions). Users can see rows they're part of.
drop policy if exists "referrals participant read" on public.referrals;
create policy "referrals participant read" on public.referrals for select
  using (auth.uid() = referrer_id or auth.uid() = referred_id or public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Code generation: RT + 6 chars from an unambiguous alphabet (no 0/O/1/I).
-- ---------------------------------------------------------------------------
create or replace function public.generate_referral_code()
returns text language plpgsql volatile set search_path = public as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := 'RT';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end $$;

create or replace function public.assign_referral_code()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end $$;

drop trigger if exists assign_referral_code on public.profiles;
create trigger assign_referral_code
  before insert on public.profiles
  for each row execute function public.assign_referral_code();

-- Backfill everyone who doesn't have a code yet.
update public.profiles set referral_code = public.generate_referral_code() where referral_code is null;

-- ---------------------------------------------------------------------------
-- 3. Users can't edit their own code or points (extends 0004's trigger).
-- ---------------------------------------------------------------------------
create or replace function public.protect_profile_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.is_admin             := old.is_admin;
    new.aadhaar_status       := old.aadhaar_status;
    new.aadhaar_path         := old.aadhaar_path;
    new.aadhaar_last4        := old.aadhaar_last4;
    new.aadhaar_submitted_at := old.aadhaar_submitted_at;
    new.aadhaar_reviewed_at  := old.aadhaar_reviewed_at;
    new.referral_code        := old.referral_code;
    new.referral_count       := old.referral_count;
  end if;
  return new;
end $$;

-- Buildings: owners can't set their own score; a new building inherits the
-- owner's current points. (Re-declares 0014's function with the score rule.)
create or replace function public.protect_building_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.referral_score := coalesce((select referral_count from public.profiles where id = new.owner_id), 0);
  end if;

  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status            := 'pending';
    new.owner_verified    := false;
    new.owner_verified_at := null;
    new.rating            := null;
    new.review_count      := 0;
  else
    new.owner_id := old.owner_id;
    if new.status is distinct from old.status and new.status <> 'pending' then
      new.status := old.status;
    end if;
    if new.owner_verified and not old.owner_verified then
      new.owner_verified    := old.owner_verified;
      new.owner_verified_at := old.owner_verified_at;
    end if;
    new.rating         := old.rating;
    new.review_count   := old.review_count;
    new.referral_score := old.referral_score;
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Award: called (service role) after an admin approves a building. Credits
--    the referrer at most once per referred owner — the rewarded_at claim is
--    atomic, so double-clicks / repeated approvals can't double count.
-- ---------------------------------------------------------------------------
create or replace function public.award_referral(p_referred uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_referrer uuid; v_count int;
begin
  update public.referrals
     set rewarded_at = now()
   where referred_id = p_referred and rewarded_at is null
  returning referrer_id into v_referrer;

  if v_referrer is null then
    return false;
  end if;

  update public.profiles
     set referral_count = referral_count + 1
   where id = v_referrer
  returning referral_count into v_count;

  update public.buildings set referral_score = v_count where owner_id = v_referrer;
  return true;
end $$;

revoke all on function public.award_referral(uuid) from public, anon, authenticated;
