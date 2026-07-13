"use server";

import { getBuildings } from "@/lib/data";
import { AREAS, BUILDING_TYPES } from "@/lib/constants";
import { fuzzyScore } from "@/lib/utils";
import type { Building } from "@/lib/types";

// Buildings closest to the given coordinates (used by the homepage "near you" row).
export async function nearbyBuildings(lat: number, lng: number): Promise<Building[]> {
  const all = await getBuildings({ sort: "nearest", lat, lng });
  return all.slice(0, 8);
}

export interface Suggestion {
  kind: "area" | "building";
  label: string;
  sublabel: string;
  href: string;
}

// Google-style search suggestions: fuzzy-matched areas + live building/PG names.
export async function searchSuggestions(q: string): Promise<Suggestion[]> {
  const query = q.trim();
  if (query.length < 2) return [];

  const areaHits: Suggestion[] = AREAS.map((a) => ({ a, s: fuzzyScore(query, a) }))
    .filter((x) => x.s >= 0.45)
    .sort((x, y) => y.s - x.s)
    .slice(0, 4)
    .map((x) => ({
      kind: "area",
      label: x.a,
      sublabel: "Area",
      href: `/search?area=${encodeURIComponent(x.a)}`,
    }));

  const buildings = await getBuildings({});
  const buildingHits: Suggestion[] = buildings
    .map((b) => ({ b, s: Math.max(fuzzyScore(query, b.name), fuzzyScore(query, b.area)) }))
    .filter((x) => x.s >= 0.45)
    .sort((x, y) => y.s - x.s)
    .slice(0, 5)
    .map((x) => ({
      kind: "building",
      label: x.b.name,
      sublabel: `${BUILDING_TYPES.find((t) => t.value === x.b.type)?.label ?? "Stay"} · ${x.b.area}`,
      href: `/buildings/${x.b.id}`,
    }));

  return [...areaHits, ...buildingHits].slice(0, 8);
}
