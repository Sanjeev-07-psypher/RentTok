"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Phone } from "lucide-react";
import { Button } from "./ui";
import { startCall } from "@/app/calls/actions";

export function CallButton({
  bookingId,
  label,
  enabled,
}: {
  bookingId: string;
  label: string;
  enabled: boolean;
}) {
  const [loading, setLoading] = useState(false);

  if (!enabled) {
    return (
      <Button variant="outline" size="sm" disabled title="Secure in-app calling launches soon">
        <Phone size={15} /> {label} (soon)
      </Button>
    );
  }

  async function call() {
    setLoading(true);
    const res = await startCall(bookingId);
    setLoading(false);
    if (res.ok) {
      toast.success("Connecting — your phone will ring shortly. Pick up to be connected.");
    } else {
      toast.error(res.error);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={call} disabled={loading}>
      <Phone size={15} /> {loading ? "Calling…" : label}
    </Button>
  );
}
