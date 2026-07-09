import "server-only";
import { createServerSupabase } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import { SAMPLE_ROOMS, SAMPLE_BUILDINGS } from "./sample-data";
import { distanceKm, fuzzyScore, normalizeText } from "./utils";
import { AREAS } from "./constants";
import type { Room, Building, Notification, Review } from "./types";

// ---------------------------------------------------------------------------
// Buildings (the primary listing entity)
// ---------------------------------------------------------------------------
export interface BuildingFilters {
  q?: string;
  type?: string;
  area?: string;
  minRent?: number;
  maxRent?: number;
  amenities?: string[];
  availableOnly?: boolean;
  sort?: string; // newest | price_asc | price_desc | rating | nearest
  lat?: number;
  lng?: number;
}

// Units free in a room type = total − booked (never negative).
function availableUnits(r: Room): number {
  return Math.max(0, (r.total_units ?? 1) - (r.booked_units ?? 0));
}

// Fill the derived fields (counts are in UNITS across all room types) from nested rooms.
// Paused (inactive) rooms are dropped so they never surface on public pages.
function withAggregates(b: Building, lat?: number, lng?: number): Building {
  const rooms = (b.rooms ?? [])
    .filter((r) => r.active !== false)
    .map((r) => ({ ...r, available_units: availableUnits(r) }));
  const rents = rooms.map((r) => r.rent);
  const distance_km =
    lat != null && lng != null && b.lat != null && b.lng != null
      ? distanceKm(lat, lng, b.lat, b.lng)
      : undefined;
  return {
    ...b,
    rooms,
    room_count: rooms.reduce((s, r) => s + (r.total_units ?? 1), 0),
    available_count: rooms.reduce((s, r) => s + (r.available_units ?? 0), 0),
    min_rent: rents.length ? Math.min(...rents) : 0,
    distance_km,
  };
}

function matchRoomFilters(b: Building, f: BuildingFilters): boolean {
  const min = b.min_rent ?? 0;
  if (f.maxRent != null && min > f.maxRent) return false;
  // any room at/above the floor price keeps the building in range
  if (f.minRent != null && !(b.rooms ?? []).some((r) => r.rent >= f.minRent!)) return false;
  if (f.availableOnly && (b.available_count ?? 0) === 0) return false;
  return true;
}

function sortBuildings(list: Building[], f: BuildingFilters): Building[] {
  // Buildings with at least one free unit always rank above fully-booked ones
  // (which stay visible at the end so users can save them for later).
  const availRank = (b: Building) => ((b.available_count ?? 0) > 0 ? 0 : 1);

  const byChosen = (a: Building, b: Building): number => {
    switch (f.sort) {
      case "price_asc":
        return (a.min_rent ?? 0) - (b.min_rent ?? 0);
      case "price_desc":
        return (b.min_rent ?? 0) - (a.min_rent ?? 0);
      case "rating":
        return (b.rating ?? 0) - (a.rating ?? 0);
      case "nearest":
        return (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity);
      default: // newest
        return +new Date(b.created_at) - +new Date(a.created_at);
    }
  };

  return [...list].sort((a, b) => availRank(a) - availRank(b) || byChosen(a, b));
}

function filterSampleBuildings(buildings: Building[], f: BuildingFilters): Building[] {
  return buildings
    .map((b) => withAggregates(b, f.lat, f.lng))
    .filter((b) => {
      if (f.q) {
        const hay = `${b.name} ${b.area} ${b.address}`.toLowerCase();
        if (!hay.includes(f.q.toLowerCase())) return false;
      }
      if (f.type && b.type !== f.type) return false;
      if (f.area && b.area !== f.area) return false;
      if (f.amenities?.length && !f.amenities.every((a) => b.amenities.includes(a as never))) return false;
      return matchRoomFilters(b, f);
    });
}

export async function getBuildings(filters: BuildingFilters = {}): Promise<Building[]> {
  if (!isSupabaseConfigured) {
    return sortBuildings(filterSampleBuildings(SAMPLE_BUILDINGS, filters), filters);
  }

  const supabase = await createServerSupabase();
  let query = supabase
    .from("buildings")
    .select("*, photos:building_photos(*), rooms(*)")
    .eq("status", "approved")
    .eq("active", true);

  if (filters.q)
    query = query.or(`name.ilike.%${filters.q}%,area.ilike.%${filters.q}%,address.ilike.%${filters.q}%`);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.area) query = query.eq("area", filters.area);
  if (filters.amenities?.length) query = query.contains("amenities", filters.amenities);

  const { data, error } = await query.limit(60);
  if (error) {
    console.error("getBuildings error", error.message);
    return [];
  }

  const buildings = (data as Building[]).map((b) => withAggregates(b, filters.lat, filters.lng));
  return sortBuildings(buildings.filter((b) => matchRoomFilters(b, filters)), filters);
}

export async function getFeaturedBuildings(): Promise<Building[]> {
  const buildings = await getBuildings({ sort: "newest" });
  return buildings.slice(0, 8);
}

// ---------------------------------------------------------------------------
// Typo-tolerant search. Non-`q` filters run in SQL; the free-text query is
// matched fuzzily in JS so misspellings ("tedon" → Tadong) still return cards.
// Never dead-ends: when nothing matches well, returns related stays + a "did
// you mean" area suggestion.
// ---------------------------------------------------------------------------
export interface SearchResult {
  buildings: Building[];
  fuzzy: boolean; // true when results were broadened past an exact match
  suggestion?: string; // nearest area name for a "did you mean" hint
  query?: string;
}

function bestAreaMatch(q: string): string | undefined {
  let best: { area: string; score: number } | undefined;
  for (const area of AREAS) {
    const score = fuzzyScore(q, area);
    if (!best || score > best.score) best = { area, score };
  }
  if (best && best.score >= 0.5 && normalizeText(best.area) !== normalizeText(q)) {
    return best.area;
  }
  return undefined;
}

export async function searchBuildings(filters: BuildingFilters): Promise<SearchResult> {
  const q = filters.q?.trim();
  // Let the DB handle every filter except the free-text query.
  const base = await getBuildings({ ...filters, q: undefined });

  if (!q) return { buildings: base, fuzzy: false };

  const scored = base
    .map((b) => ({
      b,
      score: Math.max(fuzzyScore(q, b.name), fuzzyScore(q, b.area), fuzzyScore(q, b.address ?? "")),
    }))
    .sort((x, y) => y.score - x.score);

  const strong = scored.filter((s) => s.score >= 0.6).map((s) => s.b);
  if (strong.length) {
    const fuzzy = scored[0].score < 1; // top hit is a near-miss, not exact
    return {
      buildings: sortBuildings(strong, filters),
      fuzzy,
      suggestion: fuzzy ? bestAreaMatch(q) : undefined,
      query: q,
    };
  }

  // Nothing matched well — show the closest related stays rather than nothing.
  const related = scored.filter((s) => s.score >= 0.3).map((s) => s.b);
  const fallback = related.length ? related : base.slice(0, 9);
  return { buildings: fallback, fuzzy: true, suggestion: bestAreaMatch(q), query: q };
}

export async function getBuilding(id: string): Promise<Building | null> {
  if (!isSupabaseConfigured) {
    const b = SAMPLE_BUILDINGS.find((x) => x.id === id);
    return b ? withAggregates(b) : null;
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("buildings")
    .select("*, photos:building_photos(*), rooms(*, photos:room_photos(*))")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getBuilding error", error.message);
    return null;
  }
  return withAggregates(data as Building);
}

// ---------------------------------------------------------------------------
// Wishlist + recently viewed (signed-in users)
// ---------------------------------------------------------------------------
export async function getWishlistIds(): Promise<string[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase.from("wishlists").select("building_id").eq("user_id", user.id);
  return (data ?? []).map((w) => w.building_id as string);
}

export async function getWishlistBuildings(): Promise<Building[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("wishlists")
    .select("created_at, building:buildings(*, photos:building_photos(*), rooms(*))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getWishlistBuildings error", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => (row as unknown as { building: Building }).building)
    .filter(Boolean)
    .map((b) => withAggregates(b));
}

export async function getRecentlyViewed(): Promise<Building[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("recently_viewed")
    .select("viewed_at, building:buildings(*, photos:building_photos(*), rooms(*))")
    .eq("user_id", user.id)
    .order("viewed_at", { ascending: false })
    .limit(20);
  if (error) {
    console.error("getRecentlyViewed error", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => (row as unknown as { building: Building }).building)
    .filter(Boolean)
    .map((b) => withAggregates(b));
}

// ---------------------------------------------------------------------------
// Notifications (signed-in users)
// ---------------------------------------------------------------------------
export async function getNotifications(): Promise<Notification[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data as Notification[]) ?? [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);
  return count ?? 0;
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export async function getRoomReviews(roomId: string): Promise<Review[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("reviews")
    .select("*, reviewer:profiles!reviews_user_id_fkey(full_name)")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });
  return (data as Review[]) ?? [];
}

// Whether the current user may review this room, plus their existing review (if any).
export async function getReviewContext(
  roomId: string
): Promise<{ canReview: boolean; myReview: Review | null }> {
  if (!isSupabaseConfigured) return { canReview: false, myReview: null };
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { canReview: false, myReview: null };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id")
    .eq("room_id", roomId)
    .eq("tenant_id", user.id)
    .eq("status", "confirmed")
    .maybeSingle();
  const { data: mine } = await supabase
    .from("reviews")
    .select("*")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  return { canReview: Boolean(booking), myReview: (mine as Review) ?? null };
}

// ---------------------------------------------------------------------------
// Rooms (rentable units — used by the booking flow and room detail)
// ---------------------------------------------------------------------------
export async function getRoom(id: string): Promise<Room | null> {
  if (!isSupabaseConfigured) {
    return SAMPLE_ROOMS.find((r) => r.id === id) ?? null;
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("rooms")
    .select("*, photos:room_photos(*), building:buildings(*)")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getRoom error", error.message);
    return null;
  }
  const room = data as Room;
  // Hide rooms whose parent building isn't publicly visible. RLS nulls the join
  // for a paused/unapproved building (unless the viewer owns it), so a missing
  // building on a room that has a building_id means it's not public.
  if (room.building_id && !room.building) return null;
  return { ...room, available_units: availableUnits(room) };
}
