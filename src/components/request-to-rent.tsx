"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "./ui";
import { AuthDialog } from "./auth-dialog";
import { requestBooking } from "@/app/bookings/actions";

export function RequestToRent({
  roomId,
  roomTitle,
  isLoggedIn,
  detailsComplete = true,
}: {
  roomId: string;
  roomTitle: string;
  isLoggedIn: boolean;
  detailsComplete?: boolean;
}) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function sendRequest() {
    if (!isLoggedIn) {
      setAuthOpen(true);
      return;
    }
    if (!detailsComplete) {
      router.push(`/account/details?next=${encodeURIComponent(`/rooms/${roomId}`)}`);
      return;
    }
    setLoading(true);
    try {
      const res = await requestBooking(roomId);
      if (res.ok) {
        toast.success(`Request sent for ${roomTitle}! The owner will reach out.`);
        router.push("/account/bookings");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button className="w-full" size="lg" onClick={sendRequest} disabled={loading}>
        {loading ? "Sending…" : "Request to rent · Free"}
      </Button>
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
