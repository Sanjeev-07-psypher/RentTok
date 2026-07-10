"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type WishlistResult = { ok: true; wishlisted: boolean } | { ok: false; error: string };

export async function toggleWishlist(buildingId: string): Promise<WishlistResult> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to save listings." };

  const { data: existing } = await supabase
    .from("wishlists")
    .select("building_id")
    .eq("user_id", user.id)
    .eq("building_id", buildingId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("wishlists")
      .delete()
      .eq("user_id", user.id)
      .eq("building_id", buildingId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/account/wishlist");
    return { ok: true, wishlisted: false };
  }

  const { error } = await supabase
    .from("wishlists")
    .insert({ user_id: user.id, building_id: buildingId });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/account/wishlist");
  return { ok: true, wishlisted: true };
}

const PHONE_RE = /^(\+?91[-\s]?)?[6-9]\d{9}$/;

const detailsSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name"),
  phone: z.string().trim().regex(PHONE_RE, "Enter a valid mobile number"),
  age: z.coerce.number().int().min(16, "Must be 16+").max(120),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]),
  permanent_address: z.string().trim().min(6, "Enter your permanent address"),
  guardian_name: z.string().trim().min(2, "Enter your guardian's name"),
  guardian_phone: z.string().trim().regex(PHONE_RE, "Enter a valid guardian phone"),
});

// One-time tenant details. These columns are self-updatable (not in the protected
// trigger), so a normal RLS self-update is fine.
export async function saveTenantDetails(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = detailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/account/details");
  revalidatePath("/owner");
  return { ok: true };
}

// Dashboard quick-edit: owners can update just their phone + address here.
const contactSchema = z.object({
  phone: z.string().trim().regex(PHONE_RE, "Enter a valid mobile number"),
  permanent_address: z.string().trim().min(6, "Enter your address"),
});

export async function updateContactInfo(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/owner");
  revalidatePath("/account/details");
  return { ok: true };
}

const aadhaarSchema = z.object({
  path: z.string().min(3),
  last4: z.string().regex(/^\d{4}$/, "Enter the last 4 digits of your Aadhaar"),
});

// Record an Aadhaar submission. The raw image is already uploaded (client-side) to
// the private aadhaar-docs bucket under the user's own folder; here we store only
// the path + masked last-4 and flip the status to pending for manual admin review.
export async function submitAadhaar(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = aadhaarSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { path, last4 } = parsed.data;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  // The path must live under the caller's own uid folder.
  if (!path.startsWith(`${user.id}/`)) return { ok: false, error: "Invalid upload path." };

  // Aadhaar columns are protected from direct client writes (DB trigger), so this
  // privileged write goes through the service role after the identity check above.
  const { error } = await createAdminClient()
    .from("profiles")
    .update({
      aadhaar_status: "pending",
      aadhaar_last4: last4,
      aadhaar_path: path,
      aadhaar_submitted_at: new Date().toISOString(),
      aadhaar_reviewed_at: null,
    })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/account/verify");
  revalidatePath("/admin");
  return { ok: true };
}

// Store a Web Push subscription for the signed-in user (one row per browser).
const pushSubSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

export async function savePushSubscription(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = pushSubSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid subscription" };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "endpoint" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Mark all of the signed-in user's notifications as read.
export async function markNotificationsRead(): Promise<void> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  revalidatePath("/account/notifications");
}

// Record that the signed-in user viewed a building (no-op for guests).
export async function recordView(buildingId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("recently_viewed")
    .upsert(
      { user_id: user.id, building_id: buildingId, viewed_at: new Date().toISOString() },
      { onConflict: "user_id,building_id" }
    );
}
