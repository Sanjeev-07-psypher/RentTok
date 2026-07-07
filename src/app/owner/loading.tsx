import { ListSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="h-8 w-48 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="mt-8">
        <ListSkeleton rows={4} />
      </div>
    </div>
  );
}
