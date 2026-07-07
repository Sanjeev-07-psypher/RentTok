// Grey "skeleton" placeholders (YouTube-style) shown while a route loads.
function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[var(--surface-2)] ${className}`} />;
}

export function BuildingCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="aspect-[4/3] animate-pulse bg-[var(--surface-2)]" />
      <div className="space-y-2 p-4">
        <Bar className="h-4 w-3/4" />
        <Bar className="h-3 w-1/2" />
        <Bar className="mt-3 h-5 w-1/3" />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <BuildingCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="w-full space-y-2">
            <Bar className="h-4 w-1/3" />
            <Bar className="h-3 w-1/2" />
          </div>
          <Bar className="h-8 w-24 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="aspect-[4/3] animate-pulse rounded-[var(--radius-card)] bg-[var(--surface-2)]" />
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] animate-pulse rounded bg-[var(--surface-2)]" />
          ))}
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          <Bar className="h-6 w-2/3" />
          <Bar className="h-4 w-1/2" />
          <Bar className="mt-4 h-24 w-full" />
        </div>
        <Bar className="h-64 w-full" />
      </div>
    </div>
  );
}
