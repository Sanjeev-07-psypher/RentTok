"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { SearchFilters } from "./search-filters";
import { Button } from "./ui";

// Mobile-only: collapses the filter/sort controls behind a button so search
// result cards are the first thing a user sees. Opens as a bottom sheet with a
// "Done" button; changes apply live (the results behind it update as you tweak).
export function MobileFilters() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] py-2.5 text-sm font-medium shadow-[var(--shadow-sm)]"
      >
        <SlidersHorizontal size={16} /> Filters &amp; sort
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="flex max-h-[85vh] flex-col rounded-t-2xl border-t border-[var(--border)] bg-[var(--background)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <p className="font-semibold">Filters &amp; sort</p>
              <button onClick={() => setOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-5">
              <SearchFilters />
            </div>

            <div className="border-t border-[var(--border)] p-4">
              <Button className="w-full" size="lg" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
