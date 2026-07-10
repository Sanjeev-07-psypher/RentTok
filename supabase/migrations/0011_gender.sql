-- 0011_gender.sql
-- Add gender to profiles (shown on the dashboard profile card). Self-updatable
-- (not a protected column), collected via the "Your details" form.
alter table public.profiles add column if not exists gender text
  check (gender is null or gender in ('male', 'female', 'other', 'prefer_not_to_say'));
