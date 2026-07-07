"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "./ui";
import { deleteRoom } from "@/app/owner/actions";

export function DeleteListingButton({ roomId, title }: { roomId: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const res = await deleteRoom(roomId);
      if (res.ok) {
        toast.success("Listing deleted");
      } else {
        toast.error(res.error ?? "Could not delete listing");
        setConfirming(false);
      }
    });

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-[var(--muted)] sm:inline">Delete “{title}”?</span>
        <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
          {pending ? "Deleting…" : "Yes, delete"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setConfirming(true)}
      className="text-[var(--muted)] hover:text-[var(--danger)]"
      aria-label="Delete listing"
    >
      <Trash2 size={15} /> Delete
    </Button>
  );
}
