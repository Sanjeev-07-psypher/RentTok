import "server-only";
import { createAdminClient } from "./supabase/admin";
import { getRazorpay } from "./razorpay";
import { logEvent } from "./events";

export type RefundResult = { ok: true; amount: number } | { ok: false; error: string };

/**
 * Refund a booking's ₹30 fee through Razorpay.
 *   fraction = 1     → full refund (room taken by someone else)
 *   fraction = 0.85  → after the 15% cancellation cut
 * Idempotent: a fee already refunded is skipped (returns ok with 0).
 */
export async function refundBookingFee(
  bookingId: string,
  fraction: number,
  actorId?: string | null
): Promise<RefundResult> {
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("booking_id", bookingId)
    .eq("type", "booking_fee")
    .maybeSingle();

  if (!payment) return { ok: false, error: "No payment on file for this booking." };
  if (payment.status === "refunded" || payment.status === "partially_refunded") {
    return { ok: true, amount: payment.amount_refunded_paise }; // already done
  }
  if (payment.status !== "paid" || !payment.razorpay_payment_id) {
    return { ok: false, error: "Payment is not refundable." };
  }

  // Atomically CLAIM the row before hitting the gateway. Only the caller whose
  // conditional update flips paid→refund_pending proceeds, so a concurrent
  // caller can never issue a second Razorpay refund for the same payment.
  const { data: claimed } = await admin
    .from("payments")
    .update({ status: "refund_pending" })
    .eq("id", payment.id)
    .eq("status", "paid")
    .select("id");
  if (!claimed || claimed.length === 0) {
    return { ok: true, amount: payment.amount_refunded_paise }; // someone else is handling it
  }

  const amount = Math.round(payment.amount_paise * fraction);

  try {
    const refund = await getRazorpay().payments.refund(payment.razorpay_payment_id, {
      amount,
      speed: "normal",
      notes: { bookingId, fraction: String(fraction) },
    });

    await admin
      .from("payments")
      .update({
        status: amount >= payment.amount_paise ? "refunded" : "partially_refunded",
        amount_refunded_paise: amount,
        razorpay_refund_id: refund.id,
        refunded_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    await logEvent({
      type: "refund_issued",
      actorId,
      entity: "payment",
      entityId: payment.id,
      meta: { bookingId, amount, fraction },
    });

    return { ok: true, amount };
  } catch (e) {
    console.error("refundBookingFee error", e);
    // Release the claim so it can be retried.
    await admin.from("payments").update({ status: "paid" }).eq("id", payment.id).eq("status", "refund_pending");
    return { ok: false, error: e instanceof Error ? e.message : "Refund failed" };
  }
}
