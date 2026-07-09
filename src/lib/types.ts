import type { AmenityValue, RoomType, BuildingType, Availability } from "./constants";

export type ListingStatus = "pending" | "approved" | "rejected";
export type BookingStatus = "queued" | "accepted" | "rejected" | "cancelled" | "confirmed" | "refunded";
export type PaymentStatus = "created" | "paid" | "failed" | "refunded" | "partially_refunded";
export type AadhaarStatus = "none" | "pending" | "verified" | "rejected";

export interface Building {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  type: BuildingType;
  area: string;
  address: string;
  city: string;
  contact_phone: string | null;
  rules: string | null;
  floors: number | null;
  lat: number | null;
  lng: number | null;
  amenities: AmenityValue[];
  status: ListingStatus;
  active: boolean;
  owner_verified: boolean;
  owner_verified_at: string | null;
  rating: number | null;
  review_count: number;
  created_at: string;
  photos?: BuildingPhoto[];
  rooms?: Room[];
  // Derived/aggregated fields populated by the data layer:
  room_count?: number;
  available_count?: number;
  min_rent?: number;
  distance_km?: number; // set when sorting/filtering by geolocation (Phase 2)
}

export interface BuildingPhoto {
  id: string;
  building_id: string;
  url: string;
  sort_order: number;
}

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  age: number | null;
  permanent_address: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  aadhaar_status: AadhaarStatus;
  aadhaar_last4: string | null;
  aadhaar_path: string | null;
  aadhaar_submitted_at: string | null;
  aadhaar_reviewed_at: string | null;
  created_at: string;
}

export interface Room {
  id: string;
  owner_id: string;
  building_id: string | null;
  title: string;
  type: RoomType | null;
  bhk: number | null;
  floor: number | null;
  description: string | null;
  area: string;
  address: string;
  city: string;
  lat: number | null;
  lng: number | null;
  rent: number;
  deposit: number;
  rules: string | null;
  amenities: AmenityValue[];
  availability: Availability;
  total_units: number;
  booked_units: number;
  status: ListingStatus;
  active: boolean;
  rating: number | null;
  review_count: number;
  created_at: string;
  photos?: RoomPhoto[];
  building?: Building;
  // Derived by the data layer:
  available_units?: number;
}

export interface RoomPhoto {
  id: string;
  room_id: string;
  url: string;
  sort_order: number;
}

export interface Booking {
  id: string;
  room_id: string;
  tenant_id: string;
  status: BookingStatus;
  message: string | null;
  confirmed_by_owner: boolean;
  confirmed_by_tenant: boolean;
  queue_position: number | null;
  cancelled_by: "owner" | "tenant" | "system" | null;
  confirmed_at: string | null;
  created_at: string;
  room?: Room;
  tenant?: Profile;
}

export interface Call {
  id: string;
  booking_id: string | null;
  room_id: string | null;
  owner_id: string | null;
  tenant_id: string | null;
  initiated_by: "owner" | "tenant";
  exotel_call_sid: string | null;
  status: string;
  duration_sec: number | null;
  recording_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  building_id: string;
  room_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  reviewer?: { full_name: string | null } | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  amount_paise: number;
  status: PaymentStatus;
  type: "booking_fee" | "refund";
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_refund_id: string | null;
  amount_refunded_paise: number;
  refunded_at: string | null;
  created_at: string;
}
