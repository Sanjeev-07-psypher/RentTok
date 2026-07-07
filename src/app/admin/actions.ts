"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";

async function requireAdmin(): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user?.profile?.is_admin) return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

// Approve/reject a BUILDING listing. Approving also flips its pending rooms live.
export async function reviewListing(buildingId: string, status: "approved" | "rejected") {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const supabase = await createServerSupabase();

  const { data: building } = await supabase
    .from("buildings")
    .select("owner_id, name, owner_verified")
    .eq("id", buildingId)
    .single();
  if (!building) return { ok: false, error: "Building not found." };

  // Require the admin to have confirmed ownership (phone call) before going live.
  if (status === "approved" && !building.owner_verified) {
    return { ok: false, error: "Confirm ownership by phone before approving." };
  }

  const { error } = await supabase.from("buildings").update({ status }).eq("id", buildingId);
  if (error) return { ok: false, error: error.message };

  // Cascade approval to the building's pending rooms so they become bookable.
  if (status === "approved") {
    await supabase.from("rooms").update({ status: "approved" }).eq("building_id", buildingId).eq("status", "pending");
  }

  // Acknowledge the owner with an in-app notification.
  await notifyUser({
    userId: building.owner_id,
    type: status === "approved" ? "listing_approved" : "listing_rejected",
    title: status === "approved" ? `“${building.name}” is now live` : `“${building.name}” was not approved`,
    body:
      status === "approved"
        ? "Your building passed review and is now live. You can add or edit rooms anytime."
        : "Your listing didn’t pass review. Please check the details (ownership, accuracy) and feel free to resubmit or contact support.",
  });

  revalidatePath("/admin");
  return { ok: true };
}

// Admin confirms (by phone) that the lister actually owns the building.
export async function markOwnerVerified(buildingId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const supabase = await createServerSupabase();
  const { error } = await supabase
    .from("buildings")
    .update({ owner_verified: true, owner_verified_at: new Date().toISOString() })
    .eq("id", buildingId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}

// Generate a short-lived signed URL so the admin can view a private Aadhaar image.
export async function getAadhaarSignedUrl(userId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("aadhaar_path").eq("id", userId).single();
  if (!prof?.aadhaar_path) return { ok: false, error: "No document on file." };

  const { data, error } = await admin.storage.from("aadhaar-docs").createSignedUrl(prof.aadhaar_path, 300);
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create link." };
  return { ok: true, url: data.signedUrl };
}

// Verify or reject an Aadhaar submission, then DELETE the raw image either way.
export async function reviewAadhaar(userId: string, decision: "verified" | "rejected") {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const { data: prof } = await admin.from("profiles").select("aadhaar_path").eq("id", userId).single();

  if (prof?.aadhaar_path) {
    await admin.storage.from("aadhaar-docs").remove([prof.aadhaar_path]);
  }

  const { error } = await admin
    .from("profiles")
    .update({
      aadhaar_status: decision,
      aadhaar_reviewed_at: new Date().toISOString(),
      aadhaar_path: null, // raw image is gone; keep only status + last4
    })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin");
  return { ok: true };
}
