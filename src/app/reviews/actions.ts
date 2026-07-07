"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";

const reviewSchema = z.object({
  roomId: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  body: z.string().max(1000).optional().default(""),
});

// Only a tenant with a CONFIRMED booking for the room may review it (one per room).
export async function submitReview(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { roomId, rating, body } = parsed.data;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const admin = createAdminClient();

  // Eligibility: a confirmed booking for this room by this user.
  const { data: booking } = await admin
    .from("bookings")
    .select("id")
    .eq("room_id", roomId)
    .eq("tenant_id", user.id)
    .eq("status", "confirmed")
    .maybeSingle();
  if (!booking) return { ok: false, error: "Only tenants who stayed here can review this room." };

  const { data: room } = await admin.from("rooms").select("building_id").eq("id", roomId).single();
  if (!room?.building_id) return { ok: false, error: "Room not found." };

  const { error } = await admin
    .from("reviews")
    .upsert(
      { user_id: user.id, room_id: roomId, building_id: room.building_id, rating, body: body || null },
      { onConflict: "user_id,room_id" }
    );
  if (error) return { ok: false, error: error.message };

  // Roll up the building's rating from all its rooms' reviews.
  const { data: all } = await admin.from("reviews").select("rating").eq("building_id", room.building_id);
  const ratings = (all ?? []).map((r) => r.rating as number);
  const avg = ratings.length ? ratings.reduce((s, n) => s + n, 0) / ratings.length : null;
  await admin
    .from("buildings")
    .update({ rating: avg != null ? Math.round(avg * 10) / 10 : null, review_count: ratings.length })
    .eq("id", room.building_id);

  await logEvent({ type: "review_submitted", actorId: user.id, entity: "room", entityId: roomId, meta: { rating } });
  revalidatePath(`/rooms/${roomId}`);
  revalidatePath(`/buildings/${room.building_id}`);
  return { ok: true };
}
