import "server-only";
import { createServerSupabase } from "./supabase/server";
import { isSupabaseConfigured } from "./supabase/config";
import type { Profile } from "./types";

export interface CurrentUser {
  id: string;
  email: string | null;
  profile: Profile | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured) return null;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { id: user.id, email: user.email ?? null, profile: (profile as Profile) ?? null };
}

// The one-time tenant details required before a booking can be placed.
export function tenantDetailsComplete(p: Profile | null | undefined): boolean {
  return Boolean(
    p &&
      p.full_name &&
      p.phone &&
      p.age &&
      p.permanent_address &&
      p.guardian_name &&
      p.guardian_phone
  );
}
