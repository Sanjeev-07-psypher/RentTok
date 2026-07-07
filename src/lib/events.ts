import "server-only";
import { createAdminClient } from "./supabase/admin";

// Append-only audit log. Best-effort: a logging failure never breaks the action.
export async function logEvent(e: {
  type: string;
  actorId?: string | null;
  entity?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    await createAdminClient()
      .from("events")
      .insert({
        type: e.type,
        actor_id: e.actorId ?? null,
        entity: e.entity ?? null,
        entity_id: e.entityId ?? null,
        meta: e.meta ?? {},
      });
  } catch (err) {
    console.error("logEvent failed", err);
  }
}
