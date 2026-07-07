import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { logEvent } from "@/lib/events";

// Razorpay → server reconciliation. We never trust the client for payment state;
// this endpoint verifies the signature and records/reconciles authoritative events.
export async function POST(request: Request) {
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const raw = await request.text();

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: Record<string, { entity?: Record<string, unknown> }> };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const admin = createAdminClient();
  const type = event.event ?? "unknown";

  try {
    if (type === "payment.captured") {
      // Only fill in if verify never recorded it; never overwrite paid/refunded.
      const p = event.payload?.payment?.entity as { id?: string } | undefined;
      if (p?.id) {
        await admin.from("payments").update({ status: "paid" }).eq("razorpay_payment_id", p.id).eq("status", "created");
      }
    } else if (type === "payment.failed") {
      // Never downgrade a captured payment to failed.
      const p = event.payload?.payment?.entity as { id?: string } | undefined;
      if (p?.id) {
        await admin.from("payments").update({ status: "failed" }).eq("razorpay_payment_id", p.id).eq("status", "created");
      }
    } else if (type === "refund.processed" || type === "refund.created") {
      const r = event.payload?.refund?.entity as { id?: string; payment_id?: string; amount?: number } | undefined;
      if (r?.payment_id) {
        const { data: pay } = await admin
          .from("payments")
          .select("id, amount_paise, amount_refunded_paise, status")
          .eq("razorpay_payment_id", r.payment_id)
          .maybeSingle();
        // Reconcile without downgrading a full refund or shrinking the amount.
        if (pay && pay.status !== "refunded") {
          const refunded = Math.max(pay.amount_refunded_paise ?? 0, r.amount ?? 0);
          await admin
            .from("payments")
            .update({
              status: refunded >= pay.amount_paise ? "refunded" : "partially_refunded",
              razorpay_refund_id: r.id ?? null,
              amount_refunded_paise: refunded,
              refunded_at: new Date().toISOString(),
            })
            .eq("id", pay.id);
        }
      }
    }

    await logEvent({ type: `webhook_${type}`, entity: "payment", meta: { event: type } });
  } catch (e) {
    console.error("webhook handling error", e);
    // Return 5xx so Razorpay retries rather than silently diverging.
    return NextResponse.json({ error: "processing error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
