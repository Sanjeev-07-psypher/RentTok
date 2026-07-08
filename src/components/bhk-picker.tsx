"use client";

import { useState } from "react";
import { BHK_PRESETS } from "@/lib/constants";

// Segmented BHK selector: 1 / 2 / 3 BHK presets plus an "Other" option that
// reveals a number input so owners can enter 4, 5, 6+ BHK. Controlled: `value`
// is the chosen BHK count (>= 1).
export function BhkPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const isPreset = (BHK_PRESETS as readonly number[]).includes(value);
  const [other, setOther] = useState(!isPreset);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {BHK_PRESETS.map((n) => {
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
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors " +
                (active
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] hover:bg-[var(--surface-2)]")
              }
            >
              {n} BHK
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            setOther(true);
            onChange(isPreset ? 4 : value);
          }}
          className={
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors " +
            (other
              ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
              : "border-[var(--border)] hover:bg-[var(--surface-2)]")
          }
        >
          Other
        </button>
      </div>

      {other && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={20}
            value={value}
            onChange={(e) => onChange(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="h-11 w-24 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            aria-label="Number of BHK"
          />
          <span className="text-sm text-[var(--muted)]">BHK</span>
        </div>
      )}
    </div>
  );
}
