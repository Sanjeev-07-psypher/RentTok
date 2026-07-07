"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { toggleWishlist } from "@/app/account/actions";
import { AuthDialog } from "./auth-dialog";

export function WishlistButton({
  buildingId,
  initial,
  variant = "overlay",
}: {
  buildingId: string;
  initial?: boolean;
  variant?: "overlay" | "inline";
}) {
  const [on, setOn] = useState(Boolean(initial));
  const [authOpen, setAuthOpen] = useState(false);
  const [pending, start] = useTransition();

  function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    start(async () => {
      const res = await toggleWishlist(buildingId);
      if (!res.ok) {
        if (res.error.toLowerCase().includes("sign in")) setAuthOpen(true);
        else toast.error(res.error);
        return;
      }
      setOn(res.wishlisted);
      toast.success(res.wishlisted ? "Saved to wishlist" : "Removed from wishlist");
    });
  }

  const base =
    variant === "overlay"
      ? "absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[#222] shadow-sm"
      : "inline-grid h-10 w-10 place-items-center rounded-full border border-[var(--border)] bg-[var(--surface)]";

  return (
    <>
      <button
        type="button"
        aria-label={on ? "Remove from wishlist" : "Save to wishlist"}
        onClick={toggle}
        disabled={pending}
        className={`${base} transition hover:scale-105 disabled:opacity-60`}
      >
        <Heart size={17} className={on ? "fill-red-500 text-red-500" : ""} />
      </button>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
