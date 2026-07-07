// Removes the demo owner created by _seed-demo.mjs. Deleting the auth user
// cascades to their profile, rooms, photos and bookings — leaving a clean DB.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEMO_EMAIL = "demo-owner@rent-tok.local";
const { data: list } = await supabase.auth.admin.listUsers();
const user = list.users.find((u) => u.email === DEMO_EMAIL);

if (!user) {
  console.log("No demo user found — nothing to clean.");
} else {
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) throw error;
  console.log("Deleted demo owner and all their rooms. DB is clean.");
}
