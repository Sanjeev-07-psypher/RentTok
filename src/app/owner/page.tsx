import Link from "next/link";
import { Plus, Building2, DoorOpen, Pencil } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/auth";
import { LISTING_STATUS, BUILDING_TYPES, AVAILABILITY } from "@/lib/constants";
import { formatINR } from "@/lib/utils";
import { Button, Card } from "@/components/ui";
import { ConnectNotice } from "@/components/connect-notice";
import { DeleteListingButton } from "@/components/delete-listing-button";
import { DeleteBuildingButton } from "@/components/delete-building-button";
import type { Building, Room } from "@/lib/types";

export const metadata = { title: "Owner dashboard — Rent-tok" };

const statusStyle: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-500",
  approved: "bg-green-500/15 text-green-600 dark:text-green-400",
  rejected: "bg-red-500/15 text-red-500",
};

type RoomWithCount = Room & { bookings: { count: number }[] };

export default async function OwnerDashboard() {
  if (!isSupabaseConfigured) return <ConnectNotice feature="Owner dashboard" />;

  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  const { data: buildings } = await supabase
    .from("buildings")
    .select("*, rooms(*, bookings(count))")
    .eq("owner_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const list = (buildings as Building[]) ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Your buildings</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">Manage your properties, rooms and tenant requests.</p>
        </div>
        <Link href="/owner/new">
          <Button><Plus size={16} /> New building</Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <Card className="mt-8 grid place-items-center py-20 text-center">
          <Building2 size={36} className="text-[var(--muted)]" />
          <p className="mt-3 font-medium">No buildings yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">List your first property to start receiving requests.</p>
          <Link href="/owner/new" className="mt-4">
            <Button><Plus size={16} /> Add a building</Button>
          </Link>
        </Card>
      ) : (
        <div className="mt-8 space-y-5">
          {list.map((building) => {
            const rooms = (building.rooms ?? []) as RoomWithCount[];
            const available = rooms.filter((r) => r.availability === "available").length;
            const typeLabel = BUILDING_TYPES.find((t) => t.value === building.type)?.label ?? building.type;
            return (
              <Card key={building.id} className="p-4">
                {/* Building header */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link href={`/buildings/${building.id}`} className="font-semibold hover:underline">
                        {building.name}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle[building.status]}`}>
                        {LISTING_STATUS[building.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {typeLabel} · {building.area} · {rooms.length} room{rooms.length === 1 ? "" : "s"} · {available} available
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/owner/buildings/${building.id}/edit`}>
                      <Button variant="ghost" size="sm"><Pencil size={14} /> Edit</Button>
                    </Link>
                    <Link href={`/owner/buildings/${building.id}/rooms/new`}>
                      <Button variant="outline" size="sm"><Plus size={14} /> Add room</Button>
                    </Link>
                    <DeleteBuildingButton buildingId={building.id} name={building.name} />
                  </div>
                </div>

                {/* Rooms */}
                {rooms.length > 0 && (
                  <div className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
                    {rooms.map((room) => {
                      const requests = room.bookings?.[0]?.count ?? 0;
                      return (
                        <div key={room.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                          <div className="flex items-center gap-2">
                            <DoorOpen size={15} className="text-[var(--muted)]" />
                            <div>
                              <p className="text-sm font-medium">{room.title}</p>
                              <p className="text-xs text-[var(--muted)]">
                                {formatINR(room.rent)}/mo · {AVAILABILITY[room.availability]} · {requests} request{requests === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Link href={`/owner/rooms/${room.id}/edit`}>
                              <Button variant="ghost" size="sm"><Pencil size={14} /> Edit</Button>
                            </Link>
                            <Link href={`/owner/rooms/${room.id}`}>
                              <Button variant="outline" size="sm">View requests</Button>
                            </Link>
                            <DeleteListingButton roomId={room.id} title={room.title} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {rooms.length === 0 && (
                  <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm text-[var(--muted)]">
                    No rooms yet — <Link href={`/owner/buildings/${building.id}/rooms/new`} className="text-[var(--primary)] hover:underline">add your first room</Link>.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
