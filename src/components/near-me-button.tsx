"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Navigation, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGeolocation } from "./use-geolocation";
import { Button } from "./ui";

// Asks for the user's location, then re-sorts /search results by proximity.
export function NearMeButton() {
  const router = useRouter();
  const params = useSearchParams();
  const { status, request } = useGeolocation();
  const active = params.get("sort") === "nearest" && params.get("lat") != null;

  async function go() {
    if (active) {
      // toggle off — back to newest
      const next = new URLSearchParams(params.toString());
      next.delete("lat");
      next.delete("lng");
      next.set("sort", "newest");
      router.push(`/search?${next.toString()}`);
      return;
    }
    const coords = await request();
    if (!coords) {
      toast.error("Couldn't get your location. Allow location access and try again.");
      return;
    }
    const next = new URLSearchParams(params.toString());
    next.set("lat", coords.lat.toFixed(5));
    next.set("lng", coords.lng.toFixed(5));
    next.set("sort", "nearest");
    router.push(`/search?${next.toString()}`);
  }

  return (
    <Button variant={active ? "primary" : "outline"} size="sm" onClick={go} disabled={status === "loading"}>
      {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Navigation size={15} />}
      {active ? "Nearest first" : "Near me"}
    </Button>
  );
}
