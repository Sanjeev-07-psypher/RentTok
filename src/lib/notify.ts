import "server-only";
import { createAdminClient } from "./supabase/admin";
import { sendPushToUser } from "./push";

// Create an in-app notification for a user AND (best-effort) a Web Push so they
// get it in their browser/OS notification tray. Never throws.
export async function notifyUser(n: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  try {
    await createAdminClient().from("notifications").insert({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
    });
  } catch (err) {
    console.error("notifyUser failed", err);
  }

  // Fire a push notification too (no-op if the user hasn't subscribed / push isn't configured).
  await sendPushToUser(n.userId, { title: n.title, body: n.body ?? "", url: n.link ?? "/account/notifications" });
}
