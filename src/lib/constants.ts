// A BUILDING is the property shown on a card. A ROOM is a rentable unit inside it.
export const BUILDING_TYPES = [
  { value: "pg", label: "PG", icon: "home" },
  { value: "hostel", label: "Hostel", icon: "building" },
  { value: "flat", label: "Flat", icon: "building-2" },
  { value: "house", label: "House", icon: "house" },
] as const;

export type BuildingType = (typeof BUILDING_TYPES)[number]["value"];

// Room/unit kinds within a building. Older single-listing data may still carry
// pg/hostel/flat here, so those values are kept for backward compatibility.
export const ROOM_TYPES = [
  { value: "single", label: "Single", icon: "user" },
  { value: "shared", label: "Shared", icon: "users" },
  { value: "pg", label: "PG", icon: "home" },
  { value: "hostel", label: "Hostel", icon: "building" },
  { value: "flat", label: "Flat", icon: "building-2" },
] as const;

export type RoomType = (typeof ROOM_TYPES)[number]["value"];

// Rooms are now described by BHK. Owners pick 1/2/3 or enter a custom count (4+).
export const BHK_PRESETS = [1, 2, 3] as const;

// Building floors. Most buildings in Sikkim are low-rise, so offer 1–7 as quick
// picks with a manual entry for anything taller.
export const FLOOR_PRESETS = [1, 2, 3, 4, 5, 6, 7] as const;
export const FLOOR_MAX = 50;

// Floor label. 0 = Ground floor, then 1st/2nd/3rd/… with correct ordinals.
export function floorLabel(n: number | null | undefined): string {
  if (n == null) return "";
  if (n === 0) return "Ground floor";
  const mod100 = n % 100;
  const mod10 = n % 10;
  const suffix =
    mod100 >= 11 && mod100 <= 13 ? "th" : mod10 === 1 ? "st" : mod10 === 2 ? "nd" : mod10 === 3 ? "rd" : "th";
  return `${n}${suffix} floor`;
}

// Display label for a room: prefer its BHK; fall back to the legacy single/shared
// type for listings created before the BHK switch.
export function roomKindLabel(room: { bhk?: number | null; type?: string | null }): string {
  if (room.bhk && room.bhk > 0) return `${room.bhk} BHK`;
  const legacy = ROOM_TYPES.find((t) => t.value === room.type);
  return legacy?.label ?? room.type ?? "Room";
}

export const AVAILABILITY = {
  available: "Available",
  booked: "Booked",
} as const;

export type Availability = keyof typeof AVAILABILITY;

// Sort options for the search results. `nearest` is wired in Phase 2 (geolocation).
export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "nearest", label: "Nearest to me" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

// Price range bounds (₹/month) for the search slider.
export const PRICE_MIN = 0;
export const PRICE_MAX = 30000;
export const PRICE_STEP = 500;

export const AMENITIES = [
  { value: "wifi", label: "WiFi" },
  { value: "ac", label: "AC" },
  { value: "food", label: "Food / Mess" },
  { value: "attached_kitchen", label: "Attached Kitchen" },
  { value: "geyser", label: "Hot Water" },
  { value: "water_247", label: "24/7 Water" },
  { value: "parking", label: "Parking" },
  { value: "laundry", label: "Laundry" },
  { value: "power_backup", label: "Power Backup" },
  { value: "furnished", label: "Furnished" },
  { value: "attached_bathroom", label: "Attached Bathroom" },
  { value: "study_table", label: "Study Table" },
  { value: "cctv", label: "CCTV" },
] as const;

export type AmenityValue = (typeof AMENITIES)[number]["value"];

// Common areas in & around Gangtok — used for the area filter.
export const AREAS = [
  "Tadong",
  "MG Marg",
  "Development Area",
  "Deorali",
  "Ranipool",
  "Tibet Road",
  "Arithang",
  "Sichey",
  "Daragaon",
  "Burtuk",
] as const;

export const BOOKING_STATUS = {
  queued: "In queue",
  accepted: "Accepted — confirm to lock",
  rejected: "Not selected",
  cancelled: "Cancelled",
  confirmed: "Confirmed 🎉",
  refunded: "Room filled — released",
} as const;

export const LISTING_STATUS = {
  pending: "Pending review",
  approved: "Live",
  rejected: "Rejected",
} as const;

export const AADHAAR_STATUS = {
  none: "Not submitted",
  pending: "Under review",
  verified: "Verified",
  rejected: "Rejected",
} as const;
