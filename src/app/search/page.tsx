import { Suspense } from "react";
import Link from "next/link";
import { searchBuildings, getWishlistIds } from "@/lib/data";
import { SearchFilters } from "@/components/search-filters";
import { MobileFilters } from "@/components/mobile-filters";
import { NearMeButton } from "@/components/near-me-button";
import { BuildingCard } from "@/components/building-card";

export const metadata = { title: "Search rooms — RentTok" };

export default async function SearchPage(props: PageProps<"/search">) {
  const sp = await props.searchParams;

  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const amenityRaw = sp.amenity;
  const amenities = Array.isArray(amenityRaw) ? amenityRaw : amenityRaw ? [amenityRaw] : [];
  const q = get("q");

  const [result, wishlistedIds] = await Promise.all([
    searchBuildings({
      q,
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

  const { buildings, fuzzy, suggestion } = result;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {q ? `Results for “${q}”` : "Browse stays in Gangtok"}
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{buildings.length} buildings found</p>
        </div>
        <Suspense fallback={null}>
          <NearMeButton />
        </Suspense>
      </div>

      {q && fuzzy && buildings.length > 0 && (
        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm">
          No exact match for <span className="font-medium">“{q}”</span> — showing related stays.
          {suggestion && (
            <>
              {" "}Did you mean{" "}
              <Link href={`/search?area=${encodeURIComponent(suggestion)}`} className="font-semibold text-[var(--primary)] hover:underline">
                {suggestion}
              </Link>
              ?
            </>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden self-start rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 lg:block">
          <Suspense fallback={<div className="h-96" />}>
            <SearchFilters />
          </Suspense>
        </aside>

        <div>
          {/* Mobile: filters collapse behind a button so cards show first */}
          <div className="mb-4 lg:hidden">
            <Suspense fallback={null}>
              <MobileFilters />
            </Suspense>
          </div>

          {buildings.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {buildings.map((b) => (
                <BuildingCard key={b.id} building={b} wishlisted={wishlistedIds.includes(b.id)} />
              ))}
            </div>
          ) : (
            <div className="grid place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] py-24 text-center text-[var(--muted)]">
              <div>
                <p className="text-lg font-medium text-[var(--foreground)]">No stays listed yet</p>
                <p className="mt-1 text-sm">
                  {suggestion ? (
                    <>Try <Link href={`/search?area=${encodeURIComponent(suggestion)}`} className="text-[var(--primary)] hover:underline">{suggestion}</Link>, or clear some filters.</>
                  ) : (
                    "Try widening your search or clearing some filters."
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
