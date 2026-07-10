import Link from "next/link";
import Image from "next/image";
import { MapPin, DoorOpen } from "lucide-react";
import type { Building } from "@/lib/types";
import { formatINR, formatDistance } from "@/lib/utils";
import { BUILDING_TYPES, forGenderLabel } from "@/lib/constants";
import { AmenityIcon } from "./amenity-icon";
import { WishlistButton } from "./wishlist-button";

export function BuildingCard({ building, wishlisted }: { building: Building; wishlisted?: boolean }) {
  const cover = building.photos?.[0]?.url ?? building.rooms?.[0]?.photos?.[0]?.url;
  const typeLabel = BUILDING_TYPES.find((t) => t.value === building.type)?.label ?? building.type;
  const available = building.available_count ?? 0;
  const rooms = building.room_count ?? 0;

  return (
    <Link
      href={`/buildings/${building.id}`}
      className="hover-lift group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">
        {cover ? (
          <Image
            src={cover}
            alt={building.name}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)]">
            <span className="select-none text-3xl font-extrabold tracking-tight text-[var(--primary)]/35">
              RentTok
            </span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col items-start gap-1">
          <span className="rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#222] shadow-sm">
            {typeLabel}
          </span>
          {(building.for_gender === "boys" || building.for_gender === "girls") && (
            <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-foreground)] shadow-sm">
              {forGenderLabel(building.for_gender)}
            </span>
          )}
        </div>

        <WishlistButton buildingId={building.id} initial={wishlisted} />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-semibold tracking-tight">{building.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-[var(--muted)]">
          <MapPin size={14} className="shrink-0" />
          <span className="line-clamp-1">
            {building.area}, {building.city}
          </span>
          {building.distance_km != null && (
            <span className="ml-auto shrink-0 text-xs">· {formatDistance(building.distance_km)}</span>
          )}
        </p>

        <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
          <DoorOpen size={14} className="text-[var(--primary)]" />
          {available > 0 ? (
            <span className="text-[var(--primary)]">{available} of {rooms} rooms available</span>
          ) : (
            <span>Fully booked</span>
          )}
        </div>

        {building.amenities.length > 0 && (
          <div className="mt-3 flex items-center gap-3 text-[var(--muted)]">
            {building.amenities.slice(0, 4).map((a) => (
              <AmenityIcon key={a} value={a} size={16} />
            ))}
            {building.amenities.length > 4 && (
              <span className="text-xs font-medium">+{building.amenities.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-baseline gap-1 pt-4">
          <span className="text-xs text-[var(--muted)]">from</span>
          <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">
            {formatINR(building.min_rent ?? 0)}
          </span>
          <span className="text-sm text-[var(--muted)]">/ month</span>
        </div>
      </div>
    </Link>
  );
}
