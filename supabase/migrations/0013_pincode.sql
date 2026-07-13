-- 0013_pincode.sql
-- Building pincode (auto-filled from the owner's location during listing, editable).
alter table public.buildings add column if not exists pincode text;
