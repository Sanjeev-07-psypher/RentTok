-- 0004_security.sql
-- Hardening: stop clients from mutating sensitive rows directly. All booking
-- transitions and Aadhaar/admin status changes now go through server actions
-- using the service role; the browser only needs READ access. Idempotent.

-- ---------------------------------------------------------------------------
-- bookings: remove client UPDATE access. Previously tenants/owners could PATCH
-- their own booking rows directly (e.g. set status='confirmed'), bypassing the
-- payment + two-sided-confirm logic. Reads stay; writes are service-role only.
-- ---------------------------------------------------------------------------
drop policy if exists "bookings owner update"  on public.bookings;
drop policy if exists "bookings tenant cancel" on public.bookings;

-- ---------------------------------------------------------------------------
-- profiles: lock privileged columns against self-service writes.
-- A user may still edit full_name / phone / avatar_url, but cannot self-grant
-- admin or self-verify Aadhaar. The service role (auth.uid() IS NULL) bypasses
-- this, so server actions can still set these.
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
  end if;
  return new;
end $$;

drop trigger if exists protect_profile_columns on public.profiles;
create trigger protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();
