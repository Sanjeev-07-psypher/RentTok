import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/auth";
import { ConnectNotice } from "@/components/connect-notice";
import { EditBuildingForm } from "@/components/edit-building-form";
import type { Building } from "@/lib/types";

export const metadata = { title: "Edit building — RentTok" };

export default async function EditBuildingPage(props: PageProps<"/owner/buildings/[id]/edit">) {
  if (!isSupabaseConfigured) return <ConnectNotice feature="Edit building" />;

  const { id } = await props.params;
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();
  const { data: building } = await supabase
    .from("buildings")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user?.id ?? "")
    .single();

  if (!building) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/owner" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Edit building</h1>
      <EditBuildingForm building={building as Building} />
    </div>
  );
}
