import "server-only";
import Razorpay from "razorpay";
import crypto from "crypto";

export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? "";
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

export const isRazorpayConfigured = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

// ₹30 booking fee by default; override with NEXT_PUBLIC_BOOKING_FEE_PAISE.
export const BOOKING_FEE_PAISE = Number(process.env.NEXT_PUBLIC_BOOKING_FEE_PAISE ?? "3000");

export function getRazorpay() {
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
}

function timingSafeEqualHex(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return timingSafeEqualHex(expected, signature);
}

// Verify a Razorpay webhook payload against the X-Razorpay-Signature header.
export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return timingSafeEqualHex(expected, signature);
}
