import { CardGridSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="h-7 w-56 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="h-96 animate-pulse rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]" />
        <CardGridSkeleton count={9} />
      </div>
    </div>
  );
}
