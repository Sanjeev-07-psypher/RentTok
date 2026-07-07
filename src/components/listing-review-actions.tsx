"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "./ui";
import { reviewListing } from "@/app/admin/actions";

export function ListingReviewActions({ roomId }: { roomId: string }) {
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return <span className="text-sm text-[var(--muted)]">{done === "approved" ? "Approved" : "Rejected"}</span>;
  }

  const act = (status: "approved" | "rejected") =>
    startTransition(async () => {
      const res = await reviewListing(roomId, status);
      if (res.ok) {
        setDone(status);
        toast.success(status === "approved" ? "Listing is now live" : "Listing rejected");
      } else {
        toast.error(res.error ?? "Failed");
      }
    });

  return (
    <div className="flex gap-2">
      <Button size="sm" onClick={() => act("approved")} disabled={pending}>
        <Check size={15} /> Approve
      </Button>
      <Button size="sm" variant="outline" onClick={() => act("rejected")} disabled={pending}>
        <X size={15} /> Reject
      </Button>
    </div>
  );
}
