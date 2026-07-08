"use server";

import { z } from "zod";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const schema = z.object({
  name: z.string().trim().max(120).optional().default(""),
  category: z.string().trim().max(60).optional().default(""),
  message: z.string().trim().min(4, "Please write a little more").max(4000),
});

// Feedback for the RentTok team. Anyone can submit (RLS: insert allowed for all,
// read only for admins). user_id is attached when the sender is signed in.
export async function submitFeedback(input: unknown): Promise<{ ok: boolean; error?: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  // Preview mode (no backend) — accept it so the form is demoable.
  if (!isSupabaseConfigured) return { ok: true };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("feedback").insert({
    user_id: user?.id ?? null,
    name: parsed.data.name || null,
    category: parsed.data.category || null,
    message: parsed.data.message,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
