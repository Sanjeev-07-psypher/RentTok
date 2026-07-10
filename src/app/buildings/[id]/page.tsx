import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { MapPin, DoorOpen, CheckCircle2 } from "lucide-react";
import { getBuilding, getWishlistIds } from "@/lib/data";
import { BUILDING_TYPES, AMENITIES, roomKindLabel, floorLabel, forGenderLabel } from "@/lib/constants";
import { formatINR } from "@/lib/utils";
import { Card } from "@/components/ui";
import { AmenityIcon } from "@/components/amenity-icon";
import { WishlistButton } from "@/components/wishlist-button";
import { RecordView } from "@/components/record-view";

export default async function BuildingPage(props: PageProps<"/buildings/[id]">) {
  const { id } = await props.params;
  const [building, wishlistedIds] = await Promise.all([getBuilding(id), getWishlistIds()]);

  if (!building) notFound();

  const typeLabel = BUILDING_TYPES.find((t) => t.value === building.type)?.label ?? building.type;
  const amenityLabels = AMENITIES.filter((a) => building.amenities.includes(a.value));
  const photos = building.photos?.length ? building.photos : building.rooms?.[0]?.photos ?? [];
  const rooms = building.rooms ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <RecordView buildingId={building.id} />

      {/* Gallery */}
      <div className="grid gap-2 overflow-hidden rounded-[var(--radius-card)] sm:grid-cols-2">
        <div className="relative aspect-[4/3] bg-[var(--surface-2)] sm:aspect-auto">
          {photos[0] ? (
            <Image src={photos[0].url} alt={building.name} fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
          ) : (
            <div className="grid h-full min-h-[260px] place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)]">
              <span className="text-4xl font-extrabold tracking-tight text-[var(--primary)]/35">RentTok</span>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="relative aspect-[4/3] bg-[var(--surface-2)]">
              {photos[i] ? (
                <Image src={photos[i].url} alt="" fill className="object-cover" sizes="25vw" />
              ) : (
                <div className="grid h-full place-items-center text-xl font-bold text-[var(--primary)]/30">+</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-medium">{typeLabel}</span>
            {(building.for_gender === "boys" || building.for_gender === "girls") && (
              <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-[var(--primary-foreground)]">
                {forGenderLabel(building.for_gender)}
              </span>
            )}
            {building.owner_verified && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                <CheckCircle2 size={14} /> Owner verified
              </span>
            )}
          </div>

          <div className="mt-3 flex items-start justify-between gap-4">
            <h1 className="text-3xl font-extrabold">{building.name}</h1>
            <WishlistButton buildingId={building.id} initial={wishlistedIds.includes(building.id)} variant="inline" />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-[var(--muted)]">
            <MapPin size={16} /> {building.address}
          </p>

          {building.description && (
            <p className="mt-6 leading-relaxed text-[var(--foreground)]/90">{building.description}</p>
          )}

          {amenityLabels.length > 0 && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">Amenities</h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {amenityLabels.map((a) => (
                  <div key={a.value} className="flex items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-sm">
                    <AmenityIcon value={a.value} size={17} className="text-[var(--primary)]" /> {a.label}
                  </div>
                ))}
              </div>
            </section>
          )}

          {building.rules && (
            <section className="mt-8">
              <h2 className="text-lg font-bold">House rules</h2>
              <p className="mt-2 whitespace-pre-line text-sm text-[var(--muted)]">{building.rules}</p>
            </section>
          )}
        </div>

        {/* Rooms list */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <DoorOpen size={18} className="text-[var(--primary)]" /> Rooms in this building
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {building.available_count ?? 0} of {building.room_count ?? rooms.length} available
            </p>

            <div className="mt-4 space-y-3">
              {rooms.length === 0 && (
                <p className="text-sm text-[var(--muted)]">No rooms have been added yet.</p>
              )}
              {rooms.map((room) => {
                const roomTypeLabel = roomKindLabel(room);
                const avail = room.available_units ?? 0;
                const total = room.total_units ?? 1;
                const isAvailable = avail > 0;
                return (
                  <Link
                    key={room.id}
                    href={`/rooms/${room.id}`}
                    className="block rounded-xl border border-[var(--border)] p-3.5 transition-colors hover:border-[var(--primary)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{room.title}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {roomTypeLabel}
                          {room.floor != null ? ` · ${floorLabel(room.floor)}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          isAvailable
                            ? "bg-green-500/15 text-green-600 dark:text-green-400"
                            : "bg-[var(--surface-2)] text-[var(--muted)]"
                        }`}
                      >
                        {isAvailable ? `${avail} of ${total} available` : "Fully booked"}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-end gap-1">
                        <span className="text-xl font-extrabold">{formatINR(room.rent)}</span>
                        <span className="pb-0.5 text-xs text-[var(--muted)]">/ month · deposit {formatINR(room.deposit)}</span>
                      </div>
                      <span className="text-sm font-medium text-[var(--primary)]">View →</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
