"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Building2 } from "lucide-react";
import { searchSuggestions, type Suggestion } from "@/app/actions";

// Google-style search box: debounced suggestions (areas + live listings) in a
// dropdown, keyboard navigable. Enter (or the button) runs a full search.
export function SearchAutocomplete({
  initial = "",
  placeholder = "Search by area, city or room type…",
  size = "md",
  showButton = false,
  autoFocus = false,
  onNavigate,
}: {
  initial?: string;
  placeholder?: string;
  size?: "md" | "lg";
  showButton?: boolean;
  autoFocus?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setItems([]);
      return;
    }
    timer.current = setTimeout(async () => {
      const res = await searchSuggestions(q);
      setItems(res);
      setOpen(true);
      setActive(-1);
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  function goTo(href: string) {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  }

  function runSearch() {
    setOpen(false);
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      goTo(items[active].href);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const h = size === "lg" ? "h-14" : "h-11";

  return (
    <div ref={ref} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) runSearch();
        }}
        className="relative"
      >
        <Search size={size === "lg" ? 20 : 18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => items.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Search"
          autoComplete="off"
          className={`${h} w-full rounded-full border border-[var(--border)] bg-[var(--surface)] pl-11 ${showButton ? "pr-28" : "pr-4"} text-sm placeholder:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]`}
        />
        {showButton && (
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"
          >
            Search
          </button>
        )}
      </form>

      {open && items.length > 0 && (
        <ul className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-1 text-left shadow-[var(--shadow-lg)]">
          {items.map((it, i) => (
            <li key={`${it.kind}-${it.href}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => goTo(it.href)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left ${active === i ? "bg-[var(--surface-2)]" : ""}`}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--muted)]">
                  {it.kind === "area" ? <MapPin size={15} /> : <Building2 size={15} />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{it.label}</span>
                  <span className="block truncate text-xs text-[var(--muted)]">{it.sublabel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
