"use client";

export function TourLink() {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event("rt:tour"))}
      className="underline-offset-2 hover:text-[var(--foreground)] hover:underline"
    >
      Take the tour
    </button>
  );
}
