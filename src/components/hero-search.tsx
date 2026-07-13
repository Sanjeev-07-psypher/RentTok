"use client";

import { SearchAutocomplete } from "./search-autocomplete";

export function HeroSearch() {
  return (
    <div className="w-full max-w-2xl">
      <SearchAutocomplete
        size="lg"
        showButton
        placeholder="Try “Tadong”, “PG with food”, “single room”…"
      />
    </div>
  );
}
