"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, Eye, Loader2 } from "lucide-react";
import { Button } from "./ui";
import { getAadhaarSignedUrl, reviewAadhaar } from "@/app/admin/actions";

export function AadhaarReviewActions({ userId }: { userId: string }) {
  const [done, setDone] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (done) {
    return <span className="text-sm text-[var(--muted)]">{done === "verified" ? "Verified ✓" : "Rejected"}</span>;
  }

  async function view() {
    setViewing(true);
    const res = await getAadhaarSignedUrl(userId);
    setViewing(false);
    if (res.ok && res.url) window.open(res.url, "_blank", "noopener,noreferrer");
    else toast.error(res.error ?? "Could not open document");
  }

  const decide = (decision: "verified" | "rejected") =>
    startTransition(async () => {
      const res = await reviewAadhaar(userId, decision);
      if (res.ok) {
        setDone(decision);
        toast.success(decision === "verified" ? "Identity verified" : "Submission rejected");
      } else {
        toast.error(res.error ?? "Failed");
      }
    });

  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button size="sm" variant="outline" onClick={view} disabled={viewing}>
        {viewing ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />} View document
      </Button>
      <Button size="sm" onClick={() => decide("verified")} disabled={pending}>
        <Check size={15} /> Verify
      </Button>
      <Button size="sm" variant="outline" onClick={() => decide("rejected")} disabled={pending}>
        <X size={15} /> Reject
      </Button>
    </div>
  );
}
