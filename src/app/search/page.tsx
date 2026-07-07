import { Suspense } from "react";
import { getBuildings, getWishlistIds } from "@/lib/data";
import { SearchFilters } from "@/components/search-filters";
import { NearMeButton } from "@/components/near-me-button";
import { BuildingCard } from "@/components/building-card";

export const metadata = { title: "Search rooms — Rent-tok" };

export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;

  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const amenityRaw = sp.amenity;
  const amenities = Array.isArray(amenityRaw) ? amenityRaw : amenityRaw ? [amenityRaw] : [];

  const [buildings, wishlistedIds] = await Promise.all([
    getBuildings({
      q: get("q"),
      type: get("type"),
      area: get("area"),
      minRent: get("minRent") ? Number(get("minRent")) : undefined,
      maxRent: get("maxRent") ? Number(get("maxRent")) : undefined,
      amenities,
      availableOnly: get("available") === "1",
      sort: get("sort"),
    }),
    getWishlistIds(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {get("q") ? `Results for “${get("q")}”` : "Browse stays in Gangtok"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{buildings.length} buildings found</p>
        </div>
        <Suspense fallback={null}>
          <NearMeButton />
        </Suspense>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <Suspense fallback={<div className="h-96 rounded-[var(--radius-card)] border border-[var(--border)]" />}>
          <SearchFilters />
        </Suspense>

        {buildings.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {buildings.map((b) => (
              <BuildingCard key={b.id} building={b} wishlisted={wishlistedIds.includes(b.id)} />
            ))}
          </div>
        ) : (
          <div className="grid place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] py-24 text-center text-[var(--muted)]">
            <div>
              <p className="text-lg font-medium text-[var(--foreground)]">No buildings match your filters</p>
              <p className="mt-1 text-sm">Try widening your search or clearing some filters.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
