"use client";

import { useEffect } from "react";
import { recordView } from "@/app/account/actions";

// Fire-and-forget: records that the signed-in user viewed this building.
// No-op for guests (handled server-side).
export function RecordView({ buildingId }: { buildingId: string }) {
  useEffect(() => {
    void recordView(buildingId);
  }, [buildingId]);
  return null;
}
