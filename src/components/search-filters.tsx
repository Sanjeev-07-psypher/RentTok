"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  BUILDING_TYPES,
  AREAS,
  AMENITIES,
  FOR_GENDER,
  SORT_OPTIONS,
  PRICE_MIN,
  PRICE_MAX,
  PRICE_STEP,
} from "@/lib/constants";
import { formatINR } from "@/lib/utils";
import { Select, Button } from "./ui";

export function SearchFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      startTransition(() => router.push(`/search?${next.toString()}`));
    },
    [params, router]
  );

  const setManyParams = useCallback(
    (entries: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(entries)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      startTransition(() => router.push(`/search?${next.toString()}`));
    },
    [params, router]
  );

  // Amenity chips update instantly from local state; the URL (and DB re-query)
  // is debounced so tapping several chips doesn't fire a round-trip each time.
  const [amenitySel, setAmenitySel] = useState<string[]>(() => params.getAll("amenity"));
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local chips in sync when the URL changes elsewhere (Clear filters, nav).
  useEffect(() => {
    setAmenitySel(params.getAll("amenity"));
  }, [params]);

  const toggleAmenity = (value: string) => {
    setAmenitySel((prev) => {
      const nextList = prev.includes(value) ? prev.filter((a) => a !== value) : [...prev, value];
      if (debounce.current) clearTimeout(debounce.current);
      debounce.current = setTimeout(() => {
        const next = new URLSearchParams(params.toString());
        next.delete("amenity");
        nextList.forEach((a) => next.append("amenity", a));
        startTransition(() => router.push(`/search?${next.toString()}`));
      }, 300);
      return nextList;
    });
  };

  const selectedAmenities = new Set(amenitySel);
  const availableOnly = params.get("available") === "1";

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Sort by</label>
        <Select value={params.get("sort") ?? "newest"} onChange={(e) => setParam("sort", e.target.value)}>
          {SORT_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Area</label>
        <Select
          value={params.get("area") ?? ""}
          onChange={(e) => setManyParams({ area: e.target.value || null, q: null })}
        >
          <option value="">All areas</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Building type</label>
        <Select value={params.get("type") ?? ""} onChange={(e) => setParam("type", e.target.value)}>
          <option value="">Any type</option>
          {BUILDING_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium">For</label>
        <Select
          value={params.get("for") ?? "any"}
          onChange={(e) => setParam("for", e.target.value === "any" ? "" : e.target.value)}
        >
          {FOR_GENDER.map((g) => (
            <option key={g.value} value={g.value}>{g.value === "any" ? "Anyone" : g.label}</option>
          ))}
        </Select>
      </div>

      <PriceRange
        initialMin={params.get("minRent") ? Number(params.get("minRent")) : PRICE_MIN}
        initialMax={params.get("maxRent") ? Number(params.get("maxRent")) : PRICE_MAX}
        onCommit={(min, max) =>
          setManyParams({
            minRent: min > PRICE_MIN ? String(min) : null,
            maxRent: max < PRICE_MAX ? String(max) : null,
          })
        }
      />

      <label className="flex cursor-pointer items-center justify-between">
        <span className="text-sm font-medium">Available rooms only</span>
        <input
          type="checkbox"
          checked={availableOnly}
          onChange={(e) => setParam("available", e.target.checked ? "1" : "")}
          className="h-4 w-4 accent-[var(--primary)]"
        />
      </label>

      <div>
        <label className="mb-2 block text-sm font-medium">Amenities</label>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((a) => {
            const active = selectedAmenities.has(a.value);
            return (
              <button
                key={a.value}
                onClick={() => toggleAmenity(a.value)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (active
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-[var(--border)] hover:bg-[var(--surface-2)]")
                }
              >
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={() => router.push("/search")}>
        Clear filters
      </Button>
    </div>
  );
}

// Dual-handle price range slider (dependency-free). Commits to the URL on release.
function PriceRange({
  initialMin,
  initialMax,
  onCommit,
}: {
  initialMin: number;
  initialMax: number;
  onCommit: (min: number, max: number) => void;
}) {
  const [min, setMin] = useState(initialMin);
  const [max, setMax] = useState(initialMax);

  // Keep local state in sync if the URL changes elsewhere (e.g. Clear filters).
  useEffect(() => setMin(initialMin), [initialMin]);
  useEffect(() => setMax(initialMax), [initialMax]);

  const pct = (v: number) => ((v - PRICE_MIN) / (PRICE_MAX - PRICE_MIN)) * 100;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium">Price range</label>
        <span className="text-xs text-[var(--muted)]">
          {formatINR(min)} – {formatINR(max)}
          {max >= PRICE_MAX ? "+" : ""}
        </span>
      </div>

      <div className="relative h-6">
        {/* track */}
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-[var(--surface-2)]" />
        {/* selected range */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--primary)]"
          style={{ left: `${pct(min)}%`, right: `${100 - pct(max)}%` }}
        />
        <input
          type="range"
          aria-label="Minimum price"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={min}
          onChange={(e) => setMin(Math.min(Number(e.target.value), max - PRICE_STEP))}
          onPointerUp={() => onCommit(min, max)}
          onTouchEnd={() => onCommit(min, max)}
          onMouseUp={() => onCommit(min, max)}
          className="dual-range"
        />
        <input
          type="range"
          aria-label="Maximum price"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={max}
          onChange={(e) => setMax(Math.max(Number(e.target.value), min + PRICE_STEP))}
          onPointerUp={() => onCommit(min, max)}
          onTouchEnd={() => onCommit(min, max)}
          onMouseUp={() => onCommit(min, max)}
          className="dual-range"
        />
      </div>
    </div>
  );
}
