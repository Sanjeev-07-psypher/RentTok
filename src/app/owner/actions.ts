"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAadhaar } from "@/lib/supabase/config";
import { logEvent } from "@/lib/events";

export type ActionResult = { ok: true; id: string } | { ok: false; error: string };

const buildingSchema = z.object({
  name: z.string().min(3, "Name is too short"),
  type: z.enum(["pg", "hostel", "flat", "house"]),
  area: z.string().min(2, "Area is required"),
  address: z.string().min(4, "Address is required"),
  city: z.string().trim().min(1).default("Gangtok"),
  pincode: z.string().trim().max(10).optional().default(""),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
  contact_phone: z
    .string()
    .trim()
    .regex(/^(\+?91[-\s]?)?[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
  floors: z.coerce.number().int().min(1).max(50).default(1),
  for_gender: z.enum(["any", "boys", "girls"]).default("any"),
  description: z.string().max(2000).optional().default(""),
  rules: z.string().max(2000).optional().default(""),
  amenities: z.array(z.string()).default([]),
  photoUrls: z.array(z.string().url()).default([]),
});

export async function createBuilding(input: unknown): Promise<ActionResult> {
  const parsed = buildingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  // Owners must be Aadhaar-verified to list (when enforcement is enabled).
  if (requireAadhaar) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("aadhaar_status")
      .eq("id", user.id)
      .single();
    if (prof?.aadhaar_status !== "verified") {
      return { ok: false, error: "Please verify your Aadhaar before listing (Account → Verify identity)." };
    }
  }

  const { data: building, error } = await supabase
    .from("buildings")
    .insert({
      owner_id: user.id,
      name: data.name,
      type: data.type,
      area: data.area,
      address: data.address,
      city: data.city || "Gangtok",
      pincode: data.pincode || null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      contact_phone: data.contact_phone,
      floors: data.floors,
      for_gender: data.for_gender,
      description: data.description || null,
      rules: data.rules || null,
      amenities: data.amenities,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !building) return { ok: false, error: error?.message ?? "Could not create building" };

  if (data.photoUrls.length) {
    await supabase.from("building_photos").insert(
      data.photoUrls.map((url, i) => ({ building_id: building.id, url, sort_order: i }))
    );
  }

  // Backfill the owner's profile phone from the building contact if they don't
  // have one yet — so every owner has a reachable number on record.
  await supabase.from("profiles").update({ phone: data.contact_phone }).eq("id", user.id).is("phone", null);

  revalidatePath("/owner");
  return { ok: true, id: building.id };
}

const roomSchema = z.object({
  building_id: z.string().uuid(),
  title: z.string().min(2, "Room label is required"),
  bhk: z.coerce.number().int().min(1, "Pick a BHK").max(20),
  floor: z.coerce.number().int().min(0).max(50).default(0),
  rent: z.coerce.number().int().min(0),
  deposit: z.coerce.number().int().min(0),
  total_units: z.coerce.number().int().min(1).max(100).default(1),
  description: z.string().max(2000).optional().default(""),
  amenities: z.array(z.string()).default([]),
  photoUrls: z.array(z.string().url()).default([]),
});

export async function addRoom(input: unknown): Promise<ActionResult> {
  const parsed = roomSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  // The building must exist and belong to the caller. Location is inherited from it.
  const { data: building } = await supabase
    .from("buildings")
    .select("id, owner_id, area, address, city, lat, lng, status")
    .eq("id", data.building_id)
    .single();
  if (!building) return { ok: false, error: "Building not found." };
  if (building.owner_id !== user.id) return { ok: false, error: "You can only add rooms to your own buildings." };

  const { data: room, error } = await supabase
    .from("rooms")
    .insert({
      owner_id: user.id,
      building_id: building.id,
      title: data.title,
      bhk: data.bhk,
      floor: data.floor,
      area: building.area,
      address: building.address,
      city: building.city,
      lat: building.lat,
      lng: building.lng,
      rent: data.rent,
      deposit: data.deposit,
      total_units: data.total_units,
      description: data.description || null,
      amenities: data.amenities,
      availability: "available",
      status: building.status,
    })
    .select("id")
    .single();

  if (error || !room) return { ok: false, error: error?.message ?? "Could not add room" };

  if (data.photoUrls.length) {
    await supabase.from("room_photos").insert(
      data.photoUrls.map((url, i) => ({ room_id: room.id, url, sort_order: i }))
    );
  }

  revalidatePath("/owner");
  revalidatePath(`/owner/buildings/${building.id}`);
  return { ok: true, id: room.id };
}

export async function deleteBuilding(buildingId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { data: building } = await supabase
    .from("buildings")
    .select("owner_id")
    .eq("id", buildingId)
    .single();
  if (!building) return { ok: false, error: "Building not found." };
  if (building.owner_id !== user.id) return { ok: false, error: "You can only delete your own buildings." };

  // No owner-delete RLS policy, so delete with the service role after the
  // ownership check. Cascades remove rooms, photos, bookings, wishlists, history.
  const { error } = await createAdminClient().from("buildings").delete().eq("id", buildingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/owner");
  return { ok: true };
}

const buildingEditSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3, "Name is too short"),
  type: z.enum(["pg", "hostel", "flat", "house"]),
  area: z.string().min(2, "Area is required"),
  address: z.string().min(4, "Address is required"),
  contact_phone: z.string().trim().regex(/^(\+?91[-\s]?)?[6-9]\d{9}$/, "Enter a valid mobile number"),
  floors: z.coerce.number().int().min(1).max(50).default(1),
  for_gender: z.enum(["any", "boys", "girls"]).default("any"),
  description: z.string().max(2000).optional().default(""),
  rules: z.string().max(2000).optional().default(""),
  amenities: z.array(z.string()).default([]),
});

// Owner edits a building → it goes back to pending for admin re-verification.
// Blocked once any room is occupied (booked).
export async function updateBuilding(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = buildingEditSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { data: building } = await supabase.from("buildings").select("owner_id").eq("id", data.id).single();
  if (!building) return { ok: false, error: "Building not found." };
  if (building.owner_id !== user.id) return { ok: false, error: "You can only edit your own buildings." };

  const { data: rooms } = await supabase.from("rooms").select("booked_units").eq("building_id", data.id);
  if ((rooms ?? []).some((r) => (r.booked_units ?? 0) > 0)) {
    return { ok: false, error: "Can't edit — a room here is already occupied." };
  }

  const { error } = await supabase
    .from("buildings")
    .update({
      name: data.name,
      type: data.type,
      area: data.area,
      address: data.address,
      contact_phone: data.contact_phone,
      floors: data.floors,
      for_gender: data.for_gender,
      description: data.description || null,
      rules: data.rules || null,
      amenities: data.amenities,
      status: "pending",
      owner_verified: false,
      owner_verified_at: null,
    })
    .eq("id", data.id);
  if (error) return { ok: false, error: error.message };

  // Backfill the owner's profile phone from the building contact if it's empty.
  await supabase.from("profiles").update({ phone: data.contact_phone }).eq("id", user.id).is("phone", null);

  await logEvent({ type: "building_edited", actorId: user.id, entity: "building", entityId: data.id });
  revalidatePath("/owner");
  revalidatePath("/admin");
  return { ok: true };
}

const roomEditSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(2, "Room label is required"),
  bhk: z.coerce.number().int().min(1, "Pick a BHK").max(20),
  floor: z.coerce.number().int().min(0).max(50).default(0),
  total_units: z.coerce.number().int().min(1).max(100),
  rent: z.coerce.number().int().min(0),
  deposit: z.coerce.number().int().min(0),
  description: z.string().max(2000).optional().default(""),
  amenities: z.array(z.string()).default([]),
});

// Owner edits a room → the whole building goes back to pending for re-verification.
// Blocked if the room already has an occupied unit.
export async function updateRoom(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = roomEditSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { data: room } = await supabase
    .from("rooms")
    .select("owner_id, building_id, booked_units")
    .eq("id", data.id)
    .single();
  if (!room) return { ok: false, error: "Room not found." };
  if (room.owner_id !== user.id) return { ok: false, error: "You can only edit your own rooms." };
  if ((room.booked_units ?? 0) > 0) return { ok: false, error: "Can't edit — this room is already occupied." };

  const { error } = await supabase
    .from("rooms")
    .update({
      title: data.title,
      bhk: data.bhk,
      floor: data.floor,
      total_units: data.total_units,
      rent: data.rent,
      deposit: data.deposit,
      description: data.description || null,
      amenities: data.amenities,
      status: "pending",
    })
    .eq("id", data.id);
  if (error) return { ok: false, error: error.message };

  // Send the parent building back for re-verification so the change is reviewed.
  if (room.building_id) {
    await supabase
      .from("buildings")
      .update({ status: "pending", owner_verified: false, owner_verified_at: null })
      .eq("id", room.building_id);
  }

  await logEvent({ type: "room_edited", actorId: user.id, entity: "room", entityId: data.id });
  revalidatePath("/owner");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteRoom(roomId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { data: room } = await supabase.from("rooms").select("owner_id").eq("id", roomId).single();
  if (!room) return { ok: false, error: "Room not found." };
  if (room.owner_id !== user.id) return { ok: false, error: "You can only delete your own rooms." };

  const { error } = await createAdminClient().from("rooms").delete().eq("id", roomId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/owner");
  return { ok: true };
}

// Owner pauses/resumes a whole building. Inactive buildings drop out of public
// search + detail (enforced by RLS) but stay in the owner's dashboard.
export async function setBuildingActive(
  buildingId: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { data: building } = await supabase.from("buildings").select("owner_id").eq("id", buildingId).single();
  if (!building) return { ok: false, error: "Building not found." };
  if (building.owner_id !== user.id) return { ok: false, error: "You can only manage your own buildings." };

  const { error } = await supabase.from("buildings").update({ active }).eq("id", buildingId);
  if (error) return { ok: false, error: error.message };

  // Cascade to every room in the building so their state stays in sync:
  // deactivating a building pauses all its rooms; reactivating brings them back.
  await supabase.from("rooms").update({ active }).eq("building_id", buildingId).eq("owner_id", user.id);

  await logEvent({
    type: active ? "building_activated" : "building_deactivated",
    actorId: user.id,
    entity: "building",
    entityId: buildingId,
  });
  revalidatePath("/owner");
  revalidatePath(`/buildings/${buildingId}`);
  return { ok: true };
}

// Owner pauses/resumes a single room without touching the rest of the building.
export async function setRoomActive(
  roomId: string,
  active: boolean
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { data: room } = await supabase.from("rooms").select("owner_id, building_id").eq("id", roomId).single();
  if (!room) return { ok: false, error: "Room not found." };
  if (room.owner_id !== user.id) return { ok: false, error: "You can only manage your own rooms." };

  const { error } = await supabase.from("rooms").update({ active }).eq("id", roomId);
  if (error) return { ok: false, error: error.message };

  await logEvent({
    type: active ? "room_activated" : "room_deactivated",
    actorId: user.id,
    entity: "room",
    entityId: roomId,
  });
  revalidatePath("/owner");
  if (room.building_id) revalidatePath(`/buildings/${room.building_id}`);
  return { ok: true };
}

// Booking lifecycle (accept/reject/confirm/cancel) lives in src/app/bookings/actions.ts
// and runs through the service role after explicit ownership checks.
