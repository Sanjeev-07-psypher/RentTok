import { ListSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="h-7 w-40 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="mt-6">
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}
