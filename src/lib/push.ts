import "server-only";
import webpush from "web-push";
import { createAdminClient } from "./supabase/admin";

const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:hello@rent-tok.in";

// Web Push only works once VAPID keys are set (locally in .env.local, and in
// the Vercel project for production).
let vapidReady = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    vapidReady = true;
  } catch (err) {
    console.error("Invalid VAPID config — push disabled", err);
  }
}

export const isPushConfigured = vapidReady;

interface PushPayload {
  title: string;
  body: string;
  url: string;
}

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Best-effort: sends a push to every browser the user has subscribed. Prunes
// dead subscriptions. Never throws.
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!isPushConfigured) return;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);

    const subs = (data as SubRow[]) ?? [];
    if (!subs.length) return;

    const json = JSON.stringify(payload);
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            json
          );
        } catch (err) {
          const code = (err as { statusCode?: number })?.statusCode;
          // 404 Not Found / 410 Gone → subscription is dead, remove it.
          if (code === 404 || code === 410) {
            await admin.from("push_subscriptions").delete().eq("id", s.id);
          }
        }
      })
    );
  } catch (err) {
    console.error("sendPushToUser failed", err);
  }
}
