"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui";

// Shown when a page fails to load (e.g. the database is unreachable or paused)
// instead of silently rendering an empty "no listings" page.
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto grid max-w-md place-items-center px-4 py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--surface-2)] text-[var(--primary)]">
        <WifiOff size={26} />
      </span>
      <h1 className="mt-5 text-2xl font-bold">We couldn’t load this page</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Our servers didn’t respond. Please try again in a moment — if it keeps happening, let us know at
        hello@rent-tok.in.
      </p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RefreshCw size={15} /> Try again
        </Button>
        <Link
          href="/"
          className="inline-flex items-center rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium hover:border-[var(--primary)]"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
