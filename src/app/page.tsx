import Link from "next/link";
import { Home as HomeIcon, Building, Building2, House, Search, ShieldCheck, KeyRound, Sparkles } from "lucide-react";
import { getBuildings, getFeaturedBuildings, getWishlistIds } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { BUILDING_TYPES, AREAS } from "@/lib/constants";
import { HeroSearch } from "@/components/hero-search";
import { BuildingCarousel } from "@/components/building-carousel";
import { NearbyBuildings } from "@/components/nearby-buildings";
import { BuildingCard } from "@/components/building-card";
import { Button } from "@/components/ui";

const TYPE_ICON: Record<string, React.ReactNode> = {
  pg: <HomeIcon size={15} />,
  hostel: <Building size={15} />,
  flat: <Building2 size={15} />,
  house: <House size={15} />,
};

export default async function Home() {
  const [featured, buildings, wishlistedIds] = await Promise.all([
    getFeaturedBuildings(),
    getBuildings(),
    getWishlistIds(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="brand-wash border-b border-[var(--border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {!isSupabaseConfigured && (
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)] shadow-[var(--shadow-sm)]">
              <strong className="text-[var(--foreground)]">Preview mode.</strong> Showing sample buildings.
              Add your Supabase keys to <code>.env.local</code> to go live.
            </div>
          )}

          <div className="flex flex-col items-center gap-6 py-14 text-center sm:py-24">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--muted)] shadow-[var(--shadow-sm)]">
              <Sparkles size={13} className="text-[var(--primary)]" /> Now live for students in Gangtok
            </span>

            <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl">
              Find your perfect room in{" "}
              <span className="text-[var(--primary)]">Gangtok</span>
            </h1>
            <p className="max-w-xl text-base text-[var(--muted)] sm:text-lg">
              Rooms, PGs, flats and hostels for students — verified, searchable, and bookable in
              minutes. Completely free — no brokerage, no booking fees.
            </p>

            <HeroSearch />

            <div className="flex flex-wrap justify-center gap-2">
              {BUILDING_TYPES.map((t) => (
                <Link
                  key={t.value}
                  href={`/search?type=${t.value}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                >
                  {TYPE_ICON[t.value]} {t.label}
                </Link>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-[var(--primary)]" /> Owner-verified listings
              </span>
              <span className="flex items-center gap-1.5">
                <HomeIcon size={16} className="text-[var(--primary)]" /> {AREAS.length}+ areas covered
              </span>
              <span className="flex items-center gap-1.5">
                <KeyRound size={16} className="text-[var(--primary)]" /> No brokerage
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <NearbyBuildings wishlistedIds={wishlistedIds} />
        <BuildingCarousel title="Popular stays in Gangtok" buildings={featured} wishlistedIds={wishlistedIds} />

        {/* All listings */}
        <section className="py-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Latest listings</h2>
            <Link href="/search" className="text-sm font-medium text-[var(--primary)] hover:underline">
              View all
            </Link>
          </div>
          {buildings.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {buildings.slice(0, 8).map((b) => (
                <BuildingCard key={b.id} building={b} wishlisted={wishlistedIds.includes(b.id)} />
              ))}
            </div>
          ) : (
            <div className="grid place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
                <HomeIcon size={26} />
              </div>
              <p className="mt-4 text-lg font-semibold">No rooms listed yet</p>
              <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">
                Rent-tok is brand new in your area. Are you an owner? Be the first to list a room and
                reach students looking right now.
              </p>
              <Link href="/owner/new" className="mt-5">
                <Button>List your space</Button>
              </Link>
            </div>
          )}
        </section>

        {/* How it works */}
        <section className="border-t border-[var(--border)] py-14">
          <h2 className="text-center text-2xl font-bold tracking-tight">How Rent-tok works</h2>
          <p className="mx-auto mt-2 max-w-md text-center text-sm text-[var(--muted)]">
            From searching to keys in hand — three simple steps.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <Step
              icon={<Search size={22} />}
              step="1"
              title="Search for free"
              body="Browse verified rooms by area, budget and amenities — no account needed to look around."
            />
            <Step
              icon={<KeyRound size={22} />}
              step="2"
              title="Request for free"
              body="Found the one? Send a free request to join the owner's queue instantly — no fees, no brokerage."
            />
            <Step
              icon={<ShieldCheck size={22} />}
              step="3"
              title="Connect & move in"
              body="The owner sees your request and reaches out directly to finalise your stay. No middlemen."
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Step({
  icon,
  step,
  title,
  body,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  body: string;
}) {
  return (
    <div className="relative rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-sm)]">
      <div className="grid h-12 w-12 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
        {icon}
      </div>
      <span className="absolute right-5 top-5 text-3xl font-extrabold text-[var(--border)]">
        {step}
      </span>
      <h3 className="mt-4 font-bold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
    </div>
  );
}
