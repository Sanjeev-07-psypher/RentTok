"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCallingConfigured, placeMaskedCall, EXOTEL_CALLBACK_SECRET } from "@/lib/calling";
import { logEvent } from "@/lib/events";

type Result = { ok: true } | { ok: false; error: string };

// Start a masked call for a booking. The caller's own phone rings first, then
// Exotel bridges to the other party — neither sees the other's real number.
export async function startCall(bookingId: string): Promise<Result> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const admin = createAdminClient();

  const { data: booking } = await admin
    .from("bookings")
    .select("id, status, tenant_id, room_id, room:rooms(owner_id, building:buildings(contact_phone))")
    .eq("id", bookingId)
    .single();

  const b = booking as unknown as {
    id: string;
    status: string;
    tenant_id: string;
    room_id: string;
    room: { owner_id: string; building: { contact_phone: string | null } | null } | null;
  } | null;
  if (!b?.room) return { ok: false, error: "Booking not found." };

  const isOwner = b.room.owner_id === user.id;
  const isTenant = b.tenant_id === user.id;
  if (!isOwner && !isTenant) return { ok: false, error: "Not your booking." };

  // Calling unlocks once the owner has accepted the request.
  if (!["accepted", "confirmed"].includes(b.status)) {
    return { ok: false, error: "Calling opens once the owner accepts the request." };
  }

  if (!isCallingConfigured) {
    return { ok: false, error: "In-app calling isn't switched on yet — please use it once we enable it." };
  }

  // Resolve both real numbers (never sent to the client).
  const ownerPhone = b.room.building?.contact_phone ?? null;
  const { data: tenant } = await admin.from("profiles").select("phone").eq("id", b.tenant_id).single();
  const tenantPhone = tenant?.phone ?? null;

  const fromPhone = isOwner ? ownerPhone : tenantPhone;
  const toPhone = isOwner ? tenantPhone : ownerPhone;
  if (!fromPhone || !toPhone) {
    return { ok: false, error: "A phone number is missing for one of you. Add it in your details." };
  }

  // Record the call attempt first so the status webhook can update it.
  const { data: callRow } = await admin
    .from("calls")
    .insert({
      booking_id: b.id,
      room_id: b.room_id,
      owner_id: b.room.owner_id,
      tenant_id: b.tenant_id,
      initiated_by: isOwner ? "owner" : "tenant",
      status: "initiated",
    })
    .select("id")
    .single();

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const statusCallback =
    site && callRow
      ? `${site}/api/exotel/status?id=${callRow.id}${EXOTEL_CALLBACK_SECRET ? `&token=${EXOTEL_CALLBACK_SECRET}` : ""}`
      : undefined;

  const res = await placeMaskedCall({ from: fromPhone, to: toPhone, statusCallback });

  if (!res.ok) {
    if (callRow) await admin.from("calls").update({ status: "failed" }).eq("id", callRow.id);
    return { ok: false, error: res.error };
  }

  if (callRow) {
    await admin.from("calls").update({ exotel_call_sid: res.callSid, status: "ringing" }).eq("id", callRow.id);
  }
  await logEvent({
    type: "call_initiated",
    actorId: user.id,
    entity: "booking",
    entityId: b.id,
    meta: { by: isOwner ? "owner" : "tenant" },
  });

  return { ok: true };
}
