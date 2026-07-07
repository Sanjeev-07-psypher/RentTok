import "server-only";
import { createAdminClient } from "./supabase/admin";

// Create an in-app notification for a user. Best-effort: never throws.
export async function notifyUser(n: {
  userId: string;
  type: string;
  title: string;
  body?: string;
}): Promise<void> {
  try {
    await createAdminClient()
      .from("notifications")
      .insert({ user_id: n.userId, type: n.type, title: n.title, body: n.body ?? null });
  } catch (err) {
    console.error("notifyUser failed", err);
  }
}
