"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button, Textarea, Card } from "@/components/ui";
import { submitReview } from "@/app/reviews/actions";
import type { Review } from "@/lib/types";

export function ReviewForm({ roomId, initial }: { roomId: string; initial: Review | null }) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(initial?.body ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return toast.error("Pick a star rating.");
    setSubmitting(true);
    const res = await submitReview({ roomId, rating, body });
    setSubmitting(false);
    if (res.ok) {
      toast.success(initial ? "Review updated" : "Thanks for your review!");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not submit");
    }
  }

  return (
    <Card className="p-5">
      <p className="font-semibold">{initial ? "Edit your review" : "Write a review"}</p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              <Star
                size={26}
                className={
                  (hover || rating) >= n
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-[var(--border)]"
                }
              />
            </button>
          ))}
        </div>
        <Textarea
          rows={3}
          placeholder="Share your experience to help others…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : initial ? "Update review" : "Post review"}
        </Button>
      </form>
    </Card>
  );
}
