import { ListSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="h-8 w-32 animate-pulse rounded bg-[var(--surface-2)]" />
      <div className="mt-8">
        <ListSkeleton rows={5} />
      </div>
    </div>
  );
}
