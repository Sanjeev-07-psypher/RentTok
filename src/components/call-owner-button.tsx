"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import { Button } from "./ui";
import { startCall, revealOwnerPhone } from "@/app/calls/actions";

// Tenant-side "Call owner" button.
//  * When Exotel masked calling is configured → place a masked bridged call.
//  * Until then (v1) → reveal the owner's real number (only to this requester)
//    and open the dialer. The revealed number stays visible for easy re-dialing.
export function CallOwnerButton({ bookingId, masked }: { bookingId: string; masked: boolean }) {
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);

  async function maskedCall() {
    setLoading(true);
    const res = await startCall(bookingId);
    setLoading(false);
    if (res.ok) toast.success("Connecting — your phone will ring shortly. Pick up to be connected.");
    else toast.error(res.error);
  }

  async function reveal() {
    setLoading(true);
    const res = await revealOwnerPhone(bookingId);
    setLoading(false);
    if (res.ok) {
      setRevealed(res.phone);
      window.location.href = `tel:${res.phone}`;
    } else {
      toast.error(res.error);
    }
  }

  if (revealed) {
    return (
      <a
        href={`tel:${revealed}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)] px-3 py-1.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10"
      >
        <Phone size={15} /> {revealed}
      </a>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={masked ? maskedCall : reveal} disabled={loading}>
      <Phone size={15} /> {loading ? "…" : "Call owner"}
    </Button>
  );
}
