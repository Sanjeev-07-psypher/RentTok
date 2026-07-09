import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, DoorOpen, Phone, MapPin, User } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/auth";
import { BUILDING_TYPES, LISTING_STATUS, roomKindLabel, floorLabel } from "@/lib/constants";
import { formatINR, timeAgo } from "@/lib/utils";
import { Card } from "@/components/ui";
import { ConnectNotice } from "@/components/connect-notice";
import type { Building, Room } from "@/lib/types";

export const metadata = { title: "All buildings — Admin — RentTok" };

type OwnerInfo = { full_name: string | null; phone: string | null; email: string | null };
type AdminBuilding = Building & { owner: OwnerInfo | null; rooms: Room[] };

export default async function AdminBuildingsPage() {
  if (!isSupabaseConfigured) return <ConnectNotice feature="Buildings directory" />;

  const user = await getCurrentUser();
  if (!user?.profile?.is_admin) notFound();

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("buildings")
    .select("*, owner:profiles!buildings_owner_id_fkey(full_name, phone, email), rooms(*)")
    .order("created_at", { ascending: false });

  const buildings = (data as AdminBuilding[]) ?? [];
  const totalRooms = buildings.reduce((s, b) => s + (b.rooms?.length ?? 0), 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={15} /> Back to admin
      </Link>

      <div className="mt-3 flex items-center gap-2">
        <Building2 className="text-[var(--primary)]" />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">All buildings</h1>
      </div>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Every listing on RentTok — {buildings.length} building{buildings.length === 1 ? "" : "s"}, {totalRooms} room
        {totalRooms === 1 ? "" : "s"}. Includes pending, inactive and fully-booked.
      </p>

      {buildings.length === 0 ? (
        <Card className="mt-8 grid place-items-center py-16 text-sm text-[var(--muted)]">No buildings listed yet.</Card>
      ) : (
        <div className="mt-6 space-y-4">
          {buildings.map((b) => {
            const typeLabel = BUILDING_TYPES.find((t) => t.value === b.type)?.label ?? b.type;
            const rooms = b.rooms ?? [];
            return (
              <Card key={b.id} className="overflow-hidden">
                {/* Building header */}
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/buildings/${b.id}`} className="font-semibold hover:underline">
                        {b.name}
                      </Link>
                      <Pill>{LISTING_STATUS[b.status] ?? b.status}</Pill>
                      {!b.active && <Pill tone="muted">Inactive</Pill>}
                      {b.owner_verified && <Pill tone="green">Owner verified</Pill>}
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--muted)]">
                      <span>{typeLabel}</span>
                      <span className="flex items-center gap-1"><MapPin size={12} /> {b.area}, {b.city}</span>
                      {b.floors != null && <span>{b.floors} floor{b.floors === 1 ? "" : "s"}</span>}
                      <span>listed {timeAgo(b.created_at)}</span>
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{b.address}</p>
                  </div>

                  {/* Owner block */}
                  <div className="rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs">
                    <p className="flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                      <User size={12} /> {b.owner?.full_name ?? "—"}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-[var(--muted)]">
                      <Phone size={12} />
                      {b.contact_phone ?? b.owner?.phone ? (
                        <a href={`tel:${b.contact_phone ?? b.owner?.phone}`} className="text-[var(--primary)] hover:underline">
                          {b.contact_phone ?? b.owner?.phone}
                        </a>
                      ) : (
                        "—"
                      )}
                    </p>
                    {b.owner?.email && <p className="mt-0.5 text-[var(--muted)]">{b.owner.email}</p>}
                  </div>
                </div>

                {/* Rooms table */}
                {rooms.length === 0 ? (
                  <p className="p-4 text-sm text-[var(--muted)]">No rooms added yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b border-[var(--border)] text-xs text-[var(--muted)]">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Room</th>
                          <th className="px-4 py-2.5 font-medium">Type</th>
                          <th className="px-4 py-2.5 font-medium">Floor</th>
                          <th className="px-4 py-2.5 font-medium">Rent</th>
                          <th className="px-4 py-2.5 font-medium">Units</th>
                          <th className="px-4 py-2.5 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map((r) => {
                          const total = r.total_units ?? 1;
                          const booked = r.booked_units ?? 0;
                          return (
                            <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                              <td className="px-4 py-2.5">
                                <Link href={`/rooms/${r.id}`} className="hover:underline">{r.title}</Link>
                              </td>
                              <td className="px-4 py-2.5 text-[var(--muted)]">{roomKindLabel(r)}</td>
                              <td className="px-4 py-2.5 text-[var(--muted)]">{r.floor != null ? floorLabel(r.floor) : "—"}</td>
                              <td className="px-4 py-2.5">{formatINR(r.rent)}</td>
                              <td className="px-4 py-2.5 text-[var(--muted)]">{total - booked}/{total} free</td>
                              <td className="px-4 py-2.5">
                                <span className="flex flex-wrap items-center gap-1">
                                  {!r.active && <Pill tone="muted">Inactive</Pill>}
                                  {r.availability === "booked" ? <Pill tone="blue">Booked</Pill> : <Pill tone="green">Available</Pill>}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Room count footer */}
                <div className="flex items-center gap-1.5 border-t border-[var(--border)] px-4 py-2 text-xs text-[var(--muted)]">
                  <DoorOpen size={13} /> {rooms.length} room{rooms.length === 1 ? "" : "s"}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Pill({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "green" | "blue" | "muted" }) {
  const tones: Record<string, string> = {
    default: "bg-[var(--surface-2)] text-[var(--muted)]",
    green: "bg-green-500/15 text-green-600 dark:text-green-400",
    blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    muted: "bg-[var(--surface-2)] text-[var(--muted)] ring-1 ring-[var(--border)]",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
