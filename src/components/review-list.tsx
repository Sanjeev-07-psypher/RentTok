import { Star } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import type { Review } from "@/lib/types";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No reviews yet — be the first once you&apos;ve stayed here.</p>;
  }

  return (
    <div className="space-y-4">
      {reviews.map((r) => (
        <div key={r.id} className="border-b border-[var(--border)] pb-4 last:border-0">
          <div className="flex items-center justify-between">
            <span className="font-medium">{r.reviewer?.full_name ?? "Guest"}</span>
            <span className="flex items-center gap-0.5 text-sm">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={13}
                  className={n <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-[var(--border)]"}
                />
              ))}
            </span>
          </div>
          {r.body && <p className="mt-1.5 text-sm text-[var(--foreground)]/90">{r.body}</p>}
          <p className="mt-1 text-xs text-[var(--muted)]">{timeAgo(r.created_at)}</p>
        </div>
      ))}
    </div>
  );
}
