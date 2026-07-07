"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake, X } from "lucide-react";
import { Button } from "./ui";
import { confirmBooking, cancelBooking } from "@/app/bookings/actions";

// Tenant-side controls for one of their bookings.
export function TenantBookingActions({
  bookingId,
  status,
  confirmedByTenant,
  confirmedByOwner,
}: {
  bookingId: string;
  status: string;
  confirmedByTenant: boolean;
  confirmedByOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (fn: (id: string) => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn(bookingId);
      if (res.ok) {
        toast.success(ok);
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong");
      }
    });

  if (!["queued", "accepted"].includes(status)) return null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        {status === "accepted" &&
          (confirmedByTenant ? (
            <span className="text-sm font-medium text-[var(--success)]">You confirmed ✓</span>
          ) : (
            <Button size="sm" onClick={() => run(confirmBooking, "Confirmed! Locks once the owner agrees too")} disabled={pending}>
              <Handshake size={15} /> Confirm
            </Button>
          ))}
        <Button size="sm" variant="outline" onClick={() => run(cancelBooking, "Request cancelled")} disabled={pending}>
          <X size={15} /> Cancel
        </Button>
      </div>
      {status === "accepted" && (
        <span className="text-xs text-[var(--muted)]">
          {confirmedByOwner ? "Owner has confirmed" : "Waiting on owner to confirm"}
        </span>
      )}
    </div>
  );
}
