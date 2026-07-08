"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logEvent } from "@/lib/events";
import { notifyUser } from "@/lib/notify";
import { requireAadhaar } from "@/lib/supabase/config";
import { tenantDetailsComplete } from "@/lib/auth";
import type { Profile } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };
type RequestResult = { ok: true; bookingId: string } | { ok: false; error: string };

async function currentUserId(): Promise<string | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// v1 is FREE — a booking is just a request to join the owner's queue, no payment.
// (Payment scaffolding is kept dormant in lib/razorpay + lib/payments for a future v2.)
export async function requestBooking(roomId: string): Promise<RequestResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const admin = createAdminClient();

  // Gates: identity (if enforced) + one-time tenant details.
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();
  if (requireAadhaar && (profile as Profile)?.aadhaar_status !== "verified") {
    return { ok: false, error: "Please verify your Aadhaar before booking (Account → Verify identity)." };
  }
  if (!tenantDetailsComplete(profile as Profile)) {
    return { ok: false, error: "Please add your details first." };
  }

  // Room must be live and have a free unit.
  const { data: room } = await admin
    .from("rooms")
    .select("id, status, total_units, booked_units, owner_id, title")
    .eq("id", roomId)
    .single();
  if (!room || room.status !== "approved") return { ok: false, error: "Room is not available." };
  if ((room.booked_units ?? 0) >= (room.total_units ?? 1)) {
    return { ok: false, error: "This room is fully booked." };
  }

  // Queue position = current active requests + 1.
  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .in("status", ["queued", "accepted"]);

  const { data: booking, error } = await admin
    .from("bookings")
    .insert({ room_id: roomId, tenant_id: user.id, status: "queued", queue_position: (count ?? 0) + 1 })
    .select("id")
    .single();

  if (error || !booking) {
    // bookings_active_uniq → already has an active request for this room.
    if (error?.code === "23505") {
      const { data: existing } = await admin
        .from("bookings")
        .select("id")
        .eq("room_id", roomId)
        .eq("tenant_id", user.id)
        .in("status", ["queued", "accepted"])
        .maybeSingle();
      if (existing) return { ok: true, bookingId: existing.id };
    }
    return { ok: false, error: error?.message ?? "Could not send request." };
  }

  await logEvent({
    type: "booking_created",
    actorId: user.id,
    entity: "booking",
    entityId: booking.id,
    meta: { room_id: roomId, queue_position: (count ?? 0) + 1, free: true },
  });
  await notifyUser({
    userId: room.owner_id,
    type: "booking_request",
    title: "New room request",
    body: `Someone requested "${room.title}". Review it in your dashboard.`,
  });
  revalidate();
  return { ok: true, bookingId: booking.id };
}

interface LoadedBooking {
  id: string;
  status: string;
  tenant_id: string;
  room_id: string;
  confirmed_by_owner: boolean;
  confirmed_by_tenant: boolean;
  room: { id: string; owner_id: string } | null;
}

async function loadBooking(bookingId: string): Promise<LoadedBooking | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bookings")
    .select("id, status, tenant_id, room_id, confirmed_by_owner, confirmed_by_tenant, room:rooms(id, owner_id)")
    .eq("id", bookingId)
    .single();
  return (data as unknown as LoadedBooking) ?? null;
}

function revalidate() {
  revalidatePath("/owner");
  revalidatePath("/account/bookings");
  revalidatePath("/admin");
}

// Owner accepts a queued request → moves it to "accepted" (ready for two-sided confirm).
export async function acceptBooking(bookingId: string): Promise<Result> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: "Please sign in." };
  const booking = await loadBooking(bookingId);
  if (!booking?.room) return { ok: false, error: "Booking not found." };
  if (booking.room.owner_id !== uid) return { ok: false, error: "Only the owner can accept." };
  if (booking.status !== "queued") return { ok: false, error: "This request can no longer be accepted." };

  const admin = createAdminClient();
  const { error } = await admin.from("bookings").update({ status: "accepted" }).eq("id", bookingId);
  if (error) return { ok: false, error: error.message };

  await logEvent({ type: "booking_accepted", actorId: uid, entity: "booking", entityId: bookingId, meta: { room_id: booking.room_id } });
  await notifyUser({
    userId: booking.tenant_id,
    type: "booking_accepted",
    title: "Your request was accepted 🎉",
    body: "The owner accepted your request. Confirm to lock your room, and you can call them now.",
  });
  revalidate();
  return { ok: true };
}

// Owner rejects → request leaves the queue (free platform, no refund).
export async function rejectBooking(bookingId: string): Promise<Result> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: "Please sign in." };
  const booking = await loadBooking(bookingId);
  if (!booking?.room) return { ok: false, error: "Booking not found." };
  if (booking.room.owner_id !== uid) return { ok: false, error: "Only the owner can reject." };
  if (!["queued", "accepted"].includes(booking.status)) {
    return { ok: false, error: "This request can no longer be rejected." };
  }

  const admin = createAdminClient();
  await admin
    .from("bookings")
    .update({ status: "rejected", cancelled_by: "owner" })
    .eq("id", bookingId)
    .in("status", ["queued", "accepted"]);

  await logEvent({ type: "booking_rejected", actorId: uid, entity: "booking", entityId: bookingId });
  await notifyUser({
    userId: booking.tenant_id,
    type: "booking_rejected",
    title: "Request not selected",
    body: "The owner didn't select your request this time. Keep exploring other rooms on RentTok.",
  });
  revalidate();
  return { ok: true };
}

// Tenant cancels their request (free platform, no refund).
export async function cancelBooking(bookingId: string): Promise<Result> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: "Please sign in." };
  const booking = await loadBooking(bookingId);
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.tenant_id !== uid) return { ok: false, error: "You can only cancel your own booking." };
  if (!["queued", "accepted"].includes(booking.status)) {
    return { ok: false, error: "This booking can no longer be cancelled." };
  }

  const admin = createAdminClient();
  await admin
    .from("bookings")
    .update({ status: "cancelled", cancelled_by: "tenant" })
    .eq("id", bookingId)
    .in("status", ["queued", "accepted"]);

  await logEvent({ type: "booking_cancelled", actorId: uid, entity: "booking", entityId: bookingId });
  if (booking.room) {
    await notifyUser({
      userId: booking.room.owner_id,
      type: "booking_cancelled",
      title: "A request was cancelled",
      body: "A tenant cancelled their request. Their spot has opened up in your queue.",
    });
  }
  revalidate();
  return { ok: true };
}

// Two-sided confirm. When BOTH owner and tenant confirm, one unit is taken; once the
// room type is full, everyone else still queued is released (free platform, no refund).
export async function confirmBooking(bookingId: string): Promise<Result> {
  const uid = await currentUserId();
  if (!uid) return { ok: false, error: "Please sign in." };
  const booking = await loadBooking(bookingId);
  if (!booking?.room) return { ok: false, error: "Booking not found." };

  const isOwner = booking.room.owner_id === uid;
  const isTenant = booking.tenant_id === uid;
  if (!isOwner && !isTenant) return { ok: false, error: "Not your booking." };
  if (booking.status !== "accepted") {
    return { ok: false, error: "The owner must accept the request before confirming." };
  }

  const admin = createAdminClient();
  // Set this party's flag (only while still 'accepted').
  const patch = isOwner ? { confirmed_by_owner: true } : { confirmed_by_tenant: true };
  await admin.from("bookings").update(patch).eq("id", bookingId).eq("status", "accepted");

  // Atomically finalize: exactly one caller wins this conditional update, so two
  // near-simultaneous confirms can never both run the refund-others loop.
  const { data: finalized } = await admin
    .from("bookings")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", "accepted")
    .eq("confirmed_by_owner", true)
    .eq("confirmed_by_tenant", true)
    .select("id");

  if (!finalized || finalized.length === 0) {
    // Only one side has confirmed so far (or the other call already finalized).
    await logEvent({
      type: "booking_confirm_partial",
      actorId: uid,
      entity: "booking",
      entityId: bookingId,
      meta: { by: isOwner ? "owner" : "tenant" },
    });
    // Nudge the other party that it's their turn to confirm.
    await notifyUser({
      userId: isOwner ? booking.tenant_id : booking.room.owner_id,
      type: "booking_confirm_pending",
      title: "One more step to lock the room",
      body: `${isOwner ? "The owner" : "The tenant"} confirmed the match — confirm from your side to lock it in.`,
    });
    revalidate();
    return { ok: true };
  }

  // We are the sole finalizer → take one unit of this room TYPE.
  // Recompute booked_units from the authoritative confirmed-booking count (this
  // booking is now 'confirmed'), so concurrent confirms of different units in the
  // same room can't lose an update.
  const { data: roomRow } = await admin
    .from("rooms")
    .select("total_units")
    .eq("id", booking.room_id)
    .single();
  const totalUnits = roomRow?.total_units ?? 1;
  const { count: confirmedCount } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("room_id", booking.room_id)
    .eq("status", "confirmed");
  const booked = confirmedCount ?? 1;
  const full = booked >= totalUnits;

  await admin
    .from("rooms")
    .update({ booked_units: booked, availability: full ? "booked" : "available" })
    .eq("id", booking.room_id);

  // Once the room TYPE is fully booked, release everyone else still queued.
  let releasedOthers = 0;
  if (full) {
    const { data: others } = await admin
      .from("bookings")
      .select("id")
      .eq("room_id", booking.room_id)
      .neq("id", bookingId)
      .in("status", ["queued", "accepted"]);

    for (const other of others ?? []) {
      const { data: rel } = await admin
        .from("bookings")
        .update({ status: "refunded", cancelled_by: "system" })
        .eq("id", other.id)
        .select("tenant_id")
        .single();
      if (rel?.tenant_id) {
        await notifyUser({
          userId: rel.tenant_id,
          type: "booking_released",
          title: "Room filled",
          body: "This room type just filled up, so your request was released. Explore other rooms on RentTok.",
        });
      }
      releasedOthers++;
    }
  }

  await logEvent({
    type: "booking_confirmed",
    actorId: uid,
    entity: "booking",
    entityId: bookingId,
    meta: { room_id: booking.room_id, unit: booked, total_units: totalUnits, full, released_others: releasedOthers },
  });
  // Both sides are now locked in — tell each of them.
  await notifyUser({
    userId: booking.tenant_id,
    type: "booking_confirmed",
    title: "Booking confirmed 🎉",
    body: "You're all set — the room is locked in. The owner has your details to coordinate move-in.",
  });
  await notifyUser({
    userId: booking.room.owner_id,
    type: "booking_confirmed",
    title: "Booking confirmed 🎉",
    body: "The match is locked in. Reach out to your new tenant to coordinate move-in.",
  });
  revalidate();
  return { ok: true };
}
