"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Building } from "@/lib/types";
import { BuildingCard } from "./building-card";

export function BuildingCarousel({
  title,
  buildings,
  wishlistedIds,
}: {
  title: string;
  buildings: Building[];
  wishlistedIds?: string[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  if (buildings.length === 0) return null;

  const scroll = (dir: 1 | -1) => {
    ref.current?.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  return (
    <section className="py-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
        <div className="flex gap-2">
          <CarouselButton dir={-1} onClick={() => scroll(-1)} />
          <CarouselButton dir={1} onClick={() => scroll(1)} />
        </div>
      </div>
      <div
        ref={ref}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
      >
        {buildings.map((b) => (
          <div key={b.id} className="w-[280px] shrink-0 snap-start">
            <BuildingCard building={b} wishlisted={wishlistedIds?.includes(b.id)} />
          </div>
        ))}
      </div>
    </section>
  );
}

function CarouselButton({ dir, onClick }: { dir: 1 | -1; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === 1 ? "Next" : "Previous"}
      className="grid h-9 w-9 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)]"
    >
      {dir === 1 ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
    </button>
  );
}
