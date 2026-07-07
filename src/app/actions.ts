"use server";

import { getBuildings } from "@/lib/data";
import type { Building } from "@/lib/types";

// Buildings closest to the given coordinates (used by the homepage "near you" row).
export async function nearbyBuildings(lat: number, lng: number): Promise<Building[]> {
  const all = await getBuildings({ sort: "nearest", lat, lng });
  return all.slice(0, 8);
}
