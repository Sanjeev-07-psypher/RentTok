import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Service-role client — bypasses RLS. Use ONLY in trusted server code
 * (route handlers / server actions) for privileged writes such as recording
 * a verified payment. Never import this into a Client Component.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
