import type { Room, Building } from "./types";

// Used only when Supabase isn't configured yet, so the UI is fully previewable.
const now = new Date().toISOString();

function room(
  r: Omit<
    Room,
    "city" | "status" | "active" | "bhk" | "floor" | "availability" | "photos" | "total_units" | "booked_units"
  > &
    Partial<Room>
): Room {
  return {
    city: "Gangtok",
    status: "approved",
    active: true,
    bhk: null,
    floor: null,
    availability: "available",
    total_units: 1,
    booked_units: 0,
    photos: [],
    ...r,
  } as Room;
}

export const SAMPLE_ROOMS: Room[] = [
  room({
    id: "sample-1", owner_id: "demo-owner", building_id: "b-1",
    title: "Single Room · 1st floor", type: "single",
    description: "Bright, quiet single room with a study desk and a great valley view.",
    area: "Tadong", address: "Near Tadong College, Tadong", lat: 27.305, lng: 88.61,
    rent: 6000, deposit: 6000, rules: "No smoking. Gate closes at 10:30 PM.",
    amenities: ["wifi", "geyser", "study_table", "water_247"], rating: 4.8, review_count: 120, created_at: now,
  }),
  room({
    id: "sample-1b", owner_id: "demo-owner", building_id: "b-1",
    title: "Twin Sharing · 2nd floor", type: "shared",
    description: "Twin-sharing room, ideal to split rent with a friend.",
    area: "Tadong", address: "Near Tadong College, Tadong", lat: 27.305, lng: 88.61,
    rent: 4500, deposit: 4500, rules: "No smoking.", amenities: ["wifi", "geyser", "water_247"],
    availability: "booked", rating: 4.6, review_count: 40, created_at: now,
  }),
  room({
    id: "sample-2", owner_id: "demo-owner", building_id: "b-2",
    title: "Furnished Single (Girls)", type: "single",
    description: "All-girls PG with home-cooked meals, furnished rooms and CCTV.",
    area: "Development Area", address: "Development Area, Gangtok", lat: 27.335, lng: 88.61,
    rent: 8500, deposit: 8500, rules: "Girls only. Visitors in common area only.",
    amenities: ["wifi", "food", "furnished", "cctv", "power_backup", "geyser"],
    total_units: 3, booked_units: 1, rating: 4.7, review_count: 98, created_at: now,
  }),
  room({
    id: "sample-2b", owner_id: "demo-owner", building_id: "b-2",
    title: "Triple Sharing (Girls)", type: "shared",
    description: "Budget triple-sharing with mess included.",
    area: "Development Area", address: "Development Area, Gangtok", lat: 27.335, lng: 88.61,
    rent: 6000, deposit: 6000, rules: "Girls only.", amenities: ["wifi", "food", "furnished", "cctv"],
    rating: 4.5, review_count: 50, created_at: now,
  }),
  room({
    id: "sample-3", owner_id: "demo-owner", building_id: "b-3",
    title: "Shared 2-Bed Room", type: "shared",
    description: "Spacious twin-sharing room right off MG Marg.",
    area: "MG Marg", address: "Off MG Marg, Gangtok", lat: 27.328, lng: 88.613,
    rent: 5500, deposit: 5000, rules: "Keep common areas clean.",
    amenities: ["wifi", "geyser", "attached_bathroom", "laundry"], rating: 4.6, review_count: 64, created_at: now,
  }),
  room({
    id: "sample-4", owner_id: "demo-owner", building_id: "b-4",
    title: "1BHK Flat", type: "flat",
    description: "Independent 1BHK flat with kitchen and balcony.",
    area: "Deorali", address: "Deorali Bazaar, Gangtok", lat: 27.317, lng: 88.617,
    rent: 10000, deposit: 20000, rules: "11-month agreement.",
    amenities: ["wifi", "parking", "geyser", "furnished", "power_backup"], rating: 4.5, review_count: 41, created_at: now,
  }),
  room({
    id: "sample-5", owner_id: "demo-owner", building_id: "b-5",
    title: "Hostel Bed · 4-sharing", type: "shared",
    description: "Affordable hostel bed in a 4-sharing dorm. Mess food available.",
    area: "Ranipool", address: "Ranipool, Gangtok", lat: 27.29, lng: 88.59,
    rent: 4000, deposit: 3000, rules: "Lights off by 11 PM.",
    amenities: ["wifi", "food", "water_247", "laundry"], rating: 4.3, review_count: 33, created_at: now,
  }),
];

function building(
  b: Omit<Building, "city" | "status" | "active" | "rules" | "floors" | "for_gender" | "owner_verified" | "owner_verified_at" | "photos" | "contact_phone">
): Building {
  const rooms = SAMPLE_ROOMS.filter((r) => r.building_id === b.id);
  const available = rooms.filter((r) => r.availability === "available");
  return {
    city: "Gangtok",
    status: "approved",
    active: true,
    rules: "No smoking indoors. Keep common areas clean.",
    floors: 3,
    for_gender: "any",
    owner_verified: true,
    owner_verified_at: now,
    contact_phone: "9800000000",
    photos: [],
    rooms,
    room_count: rooms.length,
    available_count: available.length,
    min_rent: rooms.length ? Math.min(...rooms.map((r) => r.rent)) : 0,
    ...b,
  };
}

export const SAMPLE_BUILDINGS: Building[] = [
  building({
    id: "b-1", owner_id: "demo-owner", name: "Valley View Residency", type: "pg",
    description: "A comfortable PG a short walk from Tadong, with single and sharing rooms.",
    area: "Tadong", address: "Near Tadong College, Tadong", lat: 27.305, lng: 88.61,
    amenities: ["wifi", "geyser", "study_table", "water_247"], rating: 4.8, review_count: 160, created_at: now,
  }),
  building({
    id: "b-2", owner_id: "demo-owner", name: "Himalayan Girls PG", type: "pg",
    description: "All-girls PG with home-cooked meals, furnished rooms and CCTV for safety.",
    area: "Development Area", address: "Development Area, Gangtok", lat: 27.335, lng: 88.61,
    amenities: ["wifi", "food", "furnished", "cctv", "power_backup", "geyser"], rating: 4.7, review_count: 148, created_at: now,
  }),
  building({
    id: "b-3", owner_id: "demo-owner", name: "MG Marg Stays", type: "flat",
    description: "Sharing rooms in the heart of the city, steps from MG Marg.",
    area: "MG Marg", address: "Off MG Marg, Gangtok", lat: 27.328, lng: 88.613,
    amenities: ["wifi", "geyser", "attached_bathroom", "laundry"], rating: 4.6, review_count: 64, created_at: now,
  }),
  building({
    id: "b-4", owner_id: "demo-owner", name: "Deorali Heights", type: "house",
    description: "Independent 1BHK flats with kitchen and balcony in quiet Deorali.",
    area: "Deorali", address: "Deorali Bazaar, Gangtok", lat: 27.317, lng: 88.617,
    amenities: ["wifi", "parking", "geyser", "furnished", "power_backup"], rating: 4.5, review_count: 41, created_at: now,
  }),
  building({
    id: "b-5", owner_id: "demo-owner", name: "Ranipool Boys Hostel", type: "hostel",
    description: "Budget hostel beds with mess — clean, simple and great value.",
    area: "Ranipool", address: "Ranipool, Gangtok", lat: 27.29, lng: 88.59,
    amenities: ["wifi", "food", "water_247", "laundry"], rating: 4.3, review_count: 33, created_at: now,
  }),
];
