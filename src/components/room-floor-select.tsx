"use client";

import { Select } from "@/components/ui";
import { floorLabel } from "@/lib/constants";

// Floor dropdown for a room: Ground floor through the building's top floor.
// Falls back to 7 floors when the building's floor count isn't known.
export function RoomFloorSelect({
  value,
  onChange,
  buildingFloors,
}: {
  value: number;
  onChange: (n: number) => void;
  buildingFloors?: number | null;
}) {
  const max = buildingFloors && buildingFloors > 0 ? buildingFloors : 7;
  const options = Array.from({ length: max + 1 }, (_, i) => i); // 0 (Ground) … max

  return (
    <Select value={String(value)} onChange={(e) => onChange(Number(e.target.value))}>
      {options.map((f) => (
        <option key={f} value={f}>
          {floorLabel(f)}
        </option>
      ))}
    </Select>
  );
}
