-- 0014_security_hardening.sql
-- Closes holes where a signed-in user could bypass the app by calling the
-- Supabase API directly with the public anon key. Idempotent — safe to re-run.
-- Run AFTER 0013_pincode.sql.

-- ---------------------------------------------------------------------------
-- 1. buildings: owners can't self-approve, self-verify, or move a building to
--    another owner. Admins (is_admin()) and the service role (auth.uid() IS
--    NULL) are unaffected. An owner edit may only send a listing BACK to review.
-- ---------------------------------------------------------------------------
create or replace function public.protect_building_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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
    new.rating       := old.rating;
    new.review_count := old.review_count;
  end if;
  return new;
end $$;

drop trigger if exists protect_building_columns on public.buildings;
create trigger protect_building_columns
  before insert or update on public.buildings
  for each row execute function public.protect_building_columns();

-- ---------------------------------------------------------------------------
-- 2. rooms: same idea. A new room inherits "approved" only when its building is
--    already approved (current behaviour); otherwise it starts pending. Owners
--    can never touch the booking counters.
-- ---------------------------------------------------------------------------
create or replace function public.protect_room_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare parent_status text;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select status into parent_status from public.buildings where id = new.building_id;
    new.status       := case when parent_status = 'approved' then 'approved' else 'pending' end;
    new.booked_units := 0;
    new.availability := 'available';
  else
    new.owner_id     := old.owner_id;
    new.building_id  := old.building_id;
    new.booked_units := old.booked_units;
    new.availability := old.availability;
    if new.status is distinct from old.status and new.status <> 'pending' then
      new.status := old.status;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists protect_room_columns on public.rooms;
create trigger protect_room_columns
  before insert or update on public.rooms
  for each row execute function public.protect_room_columns();

-- ---------------------------------------------------------------------------
-- 3. Public room visibility must respect the active flags and the building.
--    (The two old policies let paused rooms / rooms in paused buildings leak.)
-- ---------------------------------------------------------------------------
drop policy if exists "rooms public read"          on public.rooms;
drop policy if exists "rooms building public read" on public.rooms;
create policy "rooms public read" on public.rooms for select using (
  status = 'approved'
  and active
  and (
    building_id is null
    or exists (
      select 1 from public.buildings b
      where b.id = building_id and b.status = 'approved' and b.active
    )
  )
);

-- ---------------------------------------------------------------------------
-- 4. Tenant privacy: owners no longer read whole tenant profiles (phone, email,
--    address, guardian contact). The owner's requests page now loads only
--    name / age / gender / guardian name on the server.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles owner-of-booking read" on public.profiles;

-- ---------------------------------------------------------------------------
-- 5. Photo buckets: images only, 10 MB cap, and uploads only into your own
--    uid-prefixed folder (the app already uploads to "<uid>/...").
-- ---------------------------------------------------------------------------
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif','image/gif']
where id in ('room-photos', 'building-photos');

drop policy if exists "room photos auth upload"     on storage.objects;
drop policy if exists "building photos auth upload" on storage.objects;
create policy "room photos auth upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'room-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "building photos auth upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'building-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- 6. Feedback: you can't file feedback under someone else's account, and the
--    message size is bounded.
-- ---------------------------------------------------------------------------
drop policy if exists "feedback insert any" on public.feedback;
create policy "feedback insert any" on public.feedback for insert
  with check (user_id is null or user_id = auth.uid());

alter table public.feedback drop constraint if exists feedback_message_len;
alter table public.feedback add constraint feedback_message_len
  check (char_length(message) between 1 and 4000) not valid;

-- ---------------------------------------------------------------------------
-- 7. Notifications: a user may only flip their own "read" flag, nothing else.
-- ---------------------------------------------------------------------------
create or replace function public.protect_notification_columns()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.user_id    := old.user_id;
    new.type       := old.type;
    new.title      := old.title;
    new.body       := old.body;
    new.link       := old.link;
    new.created_at := old.created_at;
  end if;
  return new;
end $$;

drop trigger if exists protect_notification_columns on public.notifications;
create trigger protect_notification_columns
  before update on public.notifications
  for each row execute function public.protect_notification_columns();

-- ---------------------------------------------------------------------------
-- 8. Bookings can now END (tenant moved out) so the unit frees up again.
-- ---------------------------------------------------------------------------
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings add constraint bookings_status_check
  check (status in ('queued','accepted','rejected','cancelled','confirmed','refunded','ended'));
alter table public.bookings add column if not exists ended_at timestamptz;
