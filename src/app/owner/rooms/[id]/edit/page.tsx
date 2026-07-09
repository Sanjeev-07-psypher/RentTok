import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { ConnectNotice } from "@/components/connect-notice";
import { EditRoomForm } from "@/components/edit-room-form";
import type { Room } from "@/lib/types";

export const metadata = { title: "Edit room — RentTok" };

export default async function EditRoomPage(props: PageProps<"/owner/rooms/[id]/edit">) {
  if (!isSupabaseConfigured) return <ConnectNotice feature="Edit room" />;

  const { id } = await props.params;
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();
  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user?.id ?? "")
    .single();

  if (!room) notFound();
  const r = room as Room;
  const occupied = (r.booked_units ?? 0) > 0;

  // The floor dropdown is bounded by the parent building's floor count.
  let buildingFloors: number | null = null;
  if (r.building_id) {
    const { data: b } = await supabase.from("buildings").select("floors").eq("id", r.building_id).single();
    buildingFloors = b?.floors ?? null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/owner" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={15} /> Back to dashboard
      </Link>
      <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Edit room</h1>

      {occupied ? (
        <Card className="mt-6 p-5 text-sm text-[var(--muted)]">
          This room already has an occupied unit, so it can&apos;t be edited. You can still add a new
          room type from your dashboard.
        </Card>
      ) : (
        <EditRoomForm room={r} buildingFloors={buildingFloors} />
      )}
    </div>
  );
}
