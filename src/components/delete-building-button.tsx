"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "./ui";
import { deleteBuilding } from "@/app/owner/actions";

export function DeleteBuildingButton({ buildingId, name }: { buildingId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () =>
    startTransition(async () => {
      const res = await deleteBuilding(buildingId);
      if (res.ok) {
        toast.success("Building deleted");
      } else {
        toast.error(res.error ?? "Could not delete building");
        setConfirming(false);
      }
    });

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-xs text-[var(--muted)] sm:inline">Delete “{name}” and all its rooms?</span>
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
      aria-label="Delete building"
    >
      <Trash2 size={15} /> Delete
    </Button>
  );
}
