"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { AREAS } from "@/lib/constants";

// Searchable area picker: suggests known Gangtok areas as you type, and lets you
// enter a brand-new locality (e.g. "5th Mile") that isn't in the list yet.
export function AreaCombobox({
  value,
  onChange,
  placeholder = "Start typing an area…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = value.trim().toLowerCase();
  const matches = (q ? AREAS.filter((a) => a.toLowerCase().includes(q)) : [...AREAS]).slice(0, 8);
  const exact = AREAS.some((a) => a.toLowerCase() === q);

  return (
    <div ref={ref} className="relative">
      <MapPin size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        autoComplete="off"
      />
      {open && (matches.length > 0 || (q && !exact)) && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-[var(--shadow-lg)]">
          {matches.map((a) => (
            <li key={a}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(a);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-2)]"
              >
                <MapPin size={14} className="text-[var(--muted)]" /> {a}
              </button>
            </li>
          ))}
          {q && !exact && (
            <li className="border-t border-[var(--border)]">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setOpen(false)}
                className="w-full px-3 py-2 text-left text-sm text-[var(--primary)] hover:bg-[var(--surface-2)]"
              >
                Use “{value.trim()}”
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
