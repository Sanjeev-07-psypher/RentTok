import Link from "next/link";
import { Heart } from "lucide-react";
import { getWishlistBuildings } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Card } from "@/components/ui";
import { ConnectNotice } from "@/components/connect-notice";
import { BuildingCard } from "@/components/building-card";

export const metadata = { title: "Wishlist — Rent-tok" };

export default async function WishlistPage() {
  if (!isSupabaseConfigured) return <ConnectNotice feature="Wishlist" />;

  const user = await getCurrentUser();
  if (!user) return <SignInPrompt />;

  const buildings = await getWishlistBuildings();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Heart size={22} className="fill-red-500 text-red-500" /> Your wishlist
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">Buildings you&apos;ve saved for later.</p>

      {buildings.length === 0 ? (
        <Card className="mt-6 grid place-items-center py-20 text-center">
          <Heart size={36} className="text-[var(--muted)]" />
          <p className="mt-3 font-medium">No saved buildings yet</p>
          <Link href="/search" className="mt-1 text-sm text-[var(--primary)] hover:underline">
            Browse stays
          </Link>
        </Card>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {buildings.map((b) => (
            <BuildingCard key={b.id} building={b} wishlisted />
          ))}
        </div>
      )}
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <Heart size={36} className="mx-auto text-[var(--muted)]" />
      <p className="mt-3 font-medium">Sign in to see your wishlist</p>
      <Link href="/login" className="mt-2 inline-block text-sm text-[var(--primary)] hover:underline">
        Go to sign in
      </Link>
    </div>
  );
}
