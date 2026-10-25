"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Handshake, LogOut } from "lucide-react";
import { Button } from "./ui";
import { acceptBooking, rejectBooking, confirmBooking, endTenancy } from "@/app/bookings/actions";

// Owner-side controls for one request in the queue.
export function BookingActions({
  bookingId,
  status,
  confirmedByOwner,
  confirmedByTenant,
}: {
  bookingId: string;
  status: string;
  confirmedByOwner: boolean;
  confirmedByTenant: boolean;
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

  if (status === "confirmed") {
    return (
      <div className="flex items-center gap-2">
        <Label className="text-[var(--success)]">Confirmed ✓</Label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            if (confirm("Mark this stay as ended? The unit will become available again.")) {
              run(endTenancy, "Stay ended — the unit is available again");
            }
          }}
          disabled={pending}
        >
          <LogOut size={15} /> End stay
        </Button>
      </div>
    );
  }
  if (status === "ended") return <Label>Stay ended</Label>;
  if (status === "rejected") return <Label>Declined</Label>;
  if (status === "cancelled") return <Label>Cancelled by tenant</Label>;
  if (status === "refunded") return <Label>Room filled — released</Label>;

  if (status === "queued") {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => run(acceptBooking, "Tenant accepted — now confirm together")} disabled={pending}>
          <Check size={15} /> Accept
        </Button>
        <Button size="sm" variant="outline" onClick={() => run(rejectBooking, "Request declined")} disabled={pending}>
          <X size={15} /> Decline
        </Button>
      </div>
    );
  }

  // accepted → two-sided confirmation
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        {confirmedByOwner ? (
          <Label className="text-[var(--success)]">You confirmed ✓</Label>
        ) : (
          <Button size="sm" onClick={() => run(confirmBooking, "Confirmed — locks once both agree")} disabled={pending}>
            <Handshake size={15} /> Confirm match
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => run(rejectBooking, "Request declined")} disabled={pending}>
          <X size={15} /> Decline
        </Button>
      </div>
      <span className="text-xs text-[var(--muted)]">
        {confirmedByTenant ? "Tenant has confirmed" : "Waiting on tenant to confirm"}
      </span>
    </div>
  );
}

function Label({ children, className = "text-[var(--muted)]" }: { children: React.ReactNode; className?: string }) {
  return <span className={`text-sm font-medium ${className}`}>{children}</span>;
}
