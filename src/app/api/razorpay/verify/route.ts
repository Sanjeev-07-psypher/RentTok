import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { BOOKING_FEE_PAISE, getRazorpay, isRazorpayConfigured, verifySignature } from "@/lib/razorpay";
import { logEvent } from "@/lib/events";

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !isRazorpayConfigured) {
    return NextResponse.json({ error: "Payments not configured." }, { status: 503 });
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Re-fetch the order from Razorpay so roomId/userId come from a trusted source.
  const order = await getRazorpay().orders.fetch(razorpay_order_id);
  const roomId = String(order.notes?.roomId ?? "");
  const orderUserId = String(order.notes?.userId ?? "");
  if (!roomId || orderUserId !== user.id) {
    return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency: if this payment was already recorded, don't create a duplicate booking.
  const { data: dupe } = await admin
    .from("payments")
    .select("booking_id")
    .eq("razorpay_payment_id", razorpay_payment_id)
    .maybeSingle();
  if (dupe) return NextResponse.json({ ok: true, bookingId: dupe.booking_id });

  // Position in the room's queue = current active requests + 1.
  const { count } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .in("status", ["queued", "accepted"]);
  const queuePosition = (count ?? 0) + 1;

  const { data: booking, error: bErr } = await admin
    .from("bookings")
    .insert({ room_id: roomId, tenant_id: user.id, status: "queued", queue_position: queuePosition })
    .select("id")
    .single();
  if (bErr || !booking) {
    // Unique violation on bookings_active_uniq → they already have an active request here.
    if (bErr?.code === "23505") {
      const { data: existing } = await admin
        .from("bookings")
        .select("id")
        .eq("room_id", roomId)
        .eq("tenant_id", user.id)
        .in("status", ["queued", "accepted"])
        .maybeSingle();
      if (existing) return NextResponse.json({ ok: true, bookingId: existing.id });
    }
    console.error("booking insert error", bErr);
    return NextResponse.json({ error: "Could not record booking" }, { status: 500 });
  }

  const { error: pErr } = await admin.from("payments").insert({
    booking_id: booking.id,
    user_id: user.id,
    amount_paise: BOOKING_FEE_PAISE,
    status: "paid",
    type: "booking_fee",
    razorpay_order_id,
    razorpay_payment_id,
  });
  if (pErr) {
    // Unique violation on payments_rzp_payment_uniq → a concurrent request already
    // recorded this payment. Remove our orphan booking and return the original.
    if (pErr.code === "23505") {
      await admin.from("bookings").delete().eq("id", booking.id);
      const { data: existingP } = await admin
        .from("payments")
        .select("booking_id")
        .eq("razorpay_payment_id", razorpay_payment_id)
        .maybeSingle();
      if (existingP) return NextResponse.json({ ok: true, bookingId: existingP.booking_id });
      // We already deleted our orphan booking; don't fall through and return a dead id.
      console.error("payment insert 23505 but no existing payment row", pErr);
      return NextResponse.json({ error: "Could not record booking" }, { status: 500 });
    }
    console.error("payment insert error", pErr);
  }

  await logEvent({
    type: "booking_created",
    actorId: user.id,
    entity: "booking",
    entityId: booking.id,
    meta: { room_id: roomId, queue_position: queuePosition, amount_paise: BOOKING_FEE_PAISE },
  });

  return NextResponse.json({ ok: true, bookingId: booking.id });
}
