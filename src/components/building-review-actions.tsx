"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, X, Phone, PhoneCall, ExternalLink } from "lucide-react";
import { Button } from "./ui";
import { reviewListing, markOwnerVerified } from "@/app/admin/actions";

export function BuildingReviewActions({
  buildingId,
  ownerVerified,
  contactPhone,
}: {
  buildingId: string;
  ownerVerified: boolean;
  contactPhone: string | null;
}) {
  const [verified, setVerified] = useState(ownerVerified);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return <span className="text-sm text-[var(--muted)]">{done === "approved" ? "Approved ✓" : "Rejected"}</span>;
  }

  const confirmOwner = () =>
    startTransition(async () => {
      const res = await markOwnerVerified(buildingId);
      if (res.ok) {
        setVerified(true);
        toast.success("Ownership confirmed");
      } else {
        toast.error(res.error ?? "Failed");
      }
    });

  const act = (status: "approved" | "rejected") =>
    startTransition(async () => {
      const res = await reviewListing(buildingId, status);
      if (res.ok) {
        setDone(status);
        toast.success(status === "approved" ? "Listing is now live" : "Listing rejected");
      } else {
        toast.error(res.error ?? "Failed");
      }
    });

  return (
    <div className="flex flex-col items-end gap-2">
      <a
        href={`/buildings/${buildingId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-sm font-medium text-[var(--primary)] hover:underline"
      >
        <ExternalLink size={14} /> View full listing
      </a>
      <div className="flex items-center gap-2 text-sm">
        <Phone size={14} className="text-[var(--muted)]" />
        {contactPhone ? (
          <a href={`tel:${contactPhone}`} className="font-medium text-[var(--primary)] hover:underline">
            {contactPhone}
          </a>
        ) : (
          <span className="text-[var(--muted)]">No phone on file</span>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {!verified && (
          <Button size="sm" variant="outline" onClick={confirmOwner} disabled={pending}>
            <PhoneCall size={15} /> Mark called &amp; confirmed
          </Button>
        )}
        <Button size="sm" onClick={() => act("approved")} disabled={pending || !verified} title={!verified ? "Confirm ownership first" : ""}>
          <Check size={15} /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => act("rejected")} disabled={pending}>
          <X size={15} /> Reject
        </Button>
      </div>
      {verified && <span className="text-xs text-green-600 dark:text-green-400">Ownership confirmed</span>}
    </div>
  );
}
