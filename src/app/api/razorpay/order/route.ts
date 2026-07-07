import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured, requireAadhaar } from "@/lib/supabase/config";
import {
  BOOKING_FEE_PAISE,
  RAZORPAY_KEY_ID,
  getRazorpay,
  isRazorpayConfigured,
} from "@/lib/razorpay";

export async function POST(request: Request) {
  if (!isSupabaseConfigured || !isRazorpayConfigured) {
    return NextResponse.json(
      { error: "Payments are not configured yet. Add Supabase & Razorpay keys to .env.local." },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  // Tenants must be Aadhaar-verified to book (when enforcement is enabled).
  if (requireAadhaar) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("aadhaar_status")
      .eq("id", user.id)
      .single();
    if (prof?.aadhaar_status !== "verified") {
      return NextResponse.json(
        { error: "Please verify your Aadhaar before booking (Account → Verify identity)." },
        { status: 403 }
      );
    }
  }

  let roomId: string;
  try {
    ({ roomId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!roomId) return NextResponse.json({ error: "Missing room." }, { status: 400 });

  // Validate the room is live and still has a free unit.
  const { data: room } = await supabase
    .from("rooms")
    .select("id, status, total_units, booked_units")
    .eq("id", roomId)
    .single();
  if (!room || room.status !== "approved") {
    return NextResponse.json({ error: "Room is not available." }, { status: 404 });
  }
  if ((room.booked_units ?? 0) >= (room.total_units ?? 1)) {
    return NextResponse.json({ error: "This room is fully booked." }, { status: 409 });
  }

  // Prevent duplicate active bookings.
  const { data: existing } = await supabase
    .from("bookings")
    .select("id")
    .eq("room_id", roomId)
    .eq("tenant_id", user.id)
    .in("status", ["queued", "accepted"])
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "You've already requested this room." }, { status: 409 });
  }

  try {
    const order = await getRazorpay().orders.create({
      amount: BOOKING_FEE_PAISE,
      currency: "INR",
      receipt: `rt_${roomId.slice(0, 8)}_${Date.now()}`,
      notes: { roomId, userId: user.id },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (e) {
    console.error("razorpay order error", e);
    return NextResponse.json({ error: "Could not create payment order." }, { status: 500 });
  }
}
