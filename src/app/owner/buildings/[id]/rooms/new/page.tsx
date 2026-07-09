import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/auth";
import { ConnectNotice } from "@/components/connect-notice";
import { AddRoomForm } from "@/components/add-room-form";

export const metadata = { title: "Add a room — RentTok" };

export default async function AddRoomPage(props: PageProps<"/owner/buildings/[id]/rooms/new">) {
  if (!isSupabaseConfigured) return <ConnectNotice feature="Add a room" />;

  const { id } = await props.params;
  const sp = await props.searchParams;
  const isFirst = sp.first === "1";

  const user = await getCurrentUser();
  const supabase = await createServerSupabase();
  const { data: building } = await supabase
    .from("buildings")
    .select("id, name, owner_id, floors")
    .eq("id", id)
    .single();

  if (!building || building.owner_id !== user?.id) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <AddRoomForm
        buildingId={building.id}
        buildingName={building.name}
        buildingFloors={building.floors}
        isFirst={isFirst}
      />
    </div>
  );
}
