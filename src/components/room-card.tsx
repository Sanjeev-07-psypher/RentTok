import Link from "next/link";
import Image from "next/image";
import { Star, MapPin } from "lucide-react";
import type { Room } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { ROOM_TYPES } from "@/lib/constants";
import { AmenityIcon } from "./amenity-icon";

export function RoomCard({ room }: { room: Room }) {
  const cover = room.photos?.[0]?.url;
  const typeLabel = ROOM_TYPES.find((t) => t.value === room.type)?.label ?? room.type;

  return (
    <Link
      href={`/rooms/${room.id}`}
      className="hover-lift group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">
        {cover ? (
          <Image
            src={cover}
            alt={room.title}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)]">
            <span className="select-none text-3xl font-extrabold tracking-tight text-[var(--primary)]/35">
              Rent-tok
            </span>
          </div>
        )}

        <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-[#222] shadow-sm">
          {typeLabel}
        </span>

        {room.rating != null && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-xs font-semibold text-[#222] shadow-sm">
            <Star size={12} className="fill-[var(--primary)] text-[var(--primary)]" /> {room.rating}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-semibold tracking-tight">{room.title}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-[var(--muted)]">
          <MapPin size={14} className="shrink-0" />
          <span className="line-clamp-1">
            {room.area}, {room.city}
          </span>
        </p>

        {room.amenities.length > 0 && (
          <div className="mt-3 flex items-center gap-3 text-[var(--muted)]">
            {room.amenities.slice(0, 4).map((a) => (
              <AmenityIcon key={a} value={a} size={16} />
            ))}
            {room.amenities.length > 4 && (
              <span className="text-xs font-medium">+{room.amenities.length - 4}</span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-baseline gap-1 pt-4">
          <span className="text-lg font-bold tracking-tight text-[var(--foreground)]">
            {formatINR(room.rent)}
          </span>
          <span className="text-sm text-[var(--muted)]">/ month</span>
        </div>
      </div>
    </Link>
  );
}
