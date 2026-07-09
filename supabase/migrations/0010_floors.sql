-- 0010_floors.sql
-- Building total floors + per-room floor.
--   * buildings.floors — how many numbered floors the building has (above ground)
--   * rooms.floor       — which floor a room is on. 0 = Ground floor, 1 = 1st, …
-- Additive + idempotent.

alter table public.buildings add column if not exists floors integer
  check (floors is null or (floors >= 1 and floors <= 50));

alter table public.rooms add column if not exists floor integer
  check (floor is null or (floor >= 0 and floor <= 50));
