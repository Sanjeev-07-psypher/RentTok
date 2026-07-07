// TEMP demo seeder — creates one demo owner + a few approved rooms so the live
// site can be previewed populated. Run `node scripts/_clean-demo.mjs` to remove.
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

const { data: created, error: userErr } = await supabase.auth.admin.createUser({
  email: DEMO_EMAIL,
  email_confirm: true,
  user_metadata: { full_name: "Demo Owner" },
});
if (userErr && !/already/i.test(userErr.message)) throw userErr;

let ownerId = created?.user?.id;
if (!ownerId) {
  const { data: list } = await supabase.auth.admin.listUsers();
  ownerId = list.users.find((u) => u.email === DEMO_EMAIL)?.id;
}
console.log("owner:", ownerId);

const rooms = [
  {
    title: "Sunny Single Room near NIT Gate",
    type: "single", area: "Ranipool", address: "Near NIT Sikkim Gate, Ranipool",
    rent: 6500, deposit: 6500, rating: 4.8, review_count: 24,
    amenities: ["wifi", "geyser", "study_table", "drinking_water", "power_backup"],
    description: "A bright, quiet single room a 5-minute walk from the NIT Sikkim gate. Ideal for a focused student — comes with a study table, fast WiFi and 24x7 power backup.",
    rules: "No smoking indoors.\nGuests until 8pm.\nMonthly rent due by the 5th.",
  },
  {
    title: "Cozy PG with Home-Cooked Meals",
    type: "pg", area: "Tadong", address: "Tadong, near Govt. College",
    rent: 8000, deposit: 4000, rating: 4.6, review_count: 41,
    amenities: ["wifi", "food", "laundry", "geyser", "cctv", "drinking_water"],
    description: "Full-board PG with three home-cooked meals a day. Laundry included, CCTV at entry, and a warm community of students.",
    rules: "Veg meals only.\nQuiet hours after 10pm.",
  },
  {
    title: "Shared 2-Bed near MG Marg",
    type: "shared", area: "MG Marg", address: "Off MG Marg, Gangtok",
    rent: 5500, deposit: 5500, rating: 4.4, review_count: 18,
    amenities: ["wifi", "geyser", "furnished", "attached_bathroom"],
    description: "Furnished shared room steps from MG Marg's cafes and shops. Attached bathroom and a great view of the hills.",
    rules: "Share with one roommate.\nNo loud music.",
  },
  {
    title: "Modern Studio Flat in Development Area",
    type: "flat", area: "Development Area", address: "Development Area, Gangtok",
    rent: 12000, deposit: 12000, rating: 4.9, review_count: 12,
    amenities: ["wifi", "ac", "furnished", "parking", "attached_bathroom", "power_backup", "geyser"],
    description: "A self-contained, fully furnished studio with AC and parking. Perfect for a student who wants their own space.",
    rules: "No subletting.\n11-month agreement.",
  },
  {
    title: "Budget Hostel Bed, Deorali",
    type: "hostel", area: "Deorali", address: "Deorali, near Railway booking office",
    rent: 3500, deposit: 2000, rating: 4.1, review_count: 33,
    amenities: ["wifi", "food", "laundry", "drinking_water", "cctv"],
    description: "Affordable hostel bed with meals and laundry. A friendly, no-frills option for students on a budget.",
    rules: "Common rooms shared.\nLights out 11pm.",
  },
  {
    title: "Quiet Single with Hill View, Sichey",
    type: "single", area: "Sichey", address: "Sichey, Gangtok",
    rent: 7000, deposit: 7000, rating: 4.7, review_count: 9,
    amenities: ["wifi", "geyser", "study_table", "furnished", "power_backup"],
    description: "Peaceful furnished single room with a stunning hill view. Great natural light and a dedicated study nook.",
    rules: "No pets.\nNo smoking.",
  },
];

const { data: inserted, error: roomErr } = await supabase
  .from("rooms")
  .insert(rooms.map((r) => ({ ...r, owner_id: ownerId, city: "Gangtok", status: "approved" })))
  .select("id,title");
if (roomErr) throw roomErr;

console.log("inserted rooms:");
inserted.forEach((r) => console.log(" -", r.id, r.title));
console.log("DONE");
