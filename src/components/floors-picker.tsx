"use client";

import { useState } from "react";
import { FLOOR_PRESETS, FLOOR_MAX } from "@/lib/constants";

// Segmented picker for a building's total floors: 1–7 quick picks plus a manual
// entry for anything taller (rare in Sikkim). Controlled: `value` is the count.
export function FloorsPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const isPreset = (FLOOR_PRESETS as readonly number[]).includes(value);
  const [other, setOther] = useState(!isPreset);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FLOOR_PRESETS.map((n) => {
          const active = !other && value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                setOther(false);
                onChange(n);
              }}
              className={
                "h-10 w-10 rounded-full border text-sm font-medium transition-colors " +
                (active
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] hover:bg-[var(--surface-2)]")
              }
            >
              {n}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setOther(true);
            onChange(isPreset ? 8 : value);
          }}
          className={
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors " +
            (other
              ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "border-[var(--border)] hover:bg-[var(--surface-2)]")
          }
        >
          8+ / Other
        </button>
      </div>

      {other && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={FLOOR_MAX}
            value={value}
            onChange={(e) => onChange(Math.max(1, Math.min(FLOOR_MAX, Number(e.target.value) || 1)))}
            className="h-11 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="Number of floors"
          />
          <span className="text-sm text-[var(--muted)]">floors</span>
        </div>
      )}
    </div>
  );
}
