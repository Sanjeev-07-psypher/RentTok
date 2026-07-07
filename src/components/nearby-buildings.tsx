"use client";

import { useState } from "react";
import { Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Building } from "@/lib/types";
import { nearbyBuildings } from "@/app/actions";
import { useGeolocation } from "./use-geolocation";
import { BuildingCarousel } from "./building-carousel";
import { Button } from "./ui";

// Opt-in homepage row: prompts for location on click, then shows nearest buildings.
export function NearbyBuildings({ wishlistedIds }: { wishlistedIds?: string[] }) {
  const { status, request } = useGeolocation();
  const [buildings, setBuildings] = useState<Building[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function show() {
    setLoading(true);
    const coords = await request();
    if (!coords) {
      setLoading(false);
      toast.error("Allow location access to see rooms near you.");
      return;
    }
    try {
      const result = await nearbyBuildings(coords.lat, coords.lng);
      setBuildings(result);
    } catch {
      toast.error("Couldn't load nearby rooms.");
    } finally {
      setLoading(false);
    }
  }

  if (buildings && buildings.length > 0) {
    return <BuildingCarousel title="Rooms near you" buildings={buildings} wishlistedIds={wishlistedIds} />;
  }

  if (status === "denied" || status === "unavailable" || (buildings && buildings.length === 0)) {
    return null; // quietly fall back to the popular row
  }

  return (
    <section className="py-6">
      <div className="flex flex-col items-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-8 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
          <Navigation size={22} />
        </div>
        <div>
          <p className="font-semibold">See rooms near you</p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">Share your location to find the closest stays in Gangtok.</p>
        </div>
        <Button onClick={show} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
          {loading ? "Locating…" : "Show nearby rooms"}
        </Button>
      </div>
    </section>
  );
}
