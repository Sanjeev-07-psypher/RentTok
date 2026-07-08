"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Power, PowerOff } from "lucide-react";
import { Button } from "./ui";
import { setBuildingActive, setRoomActive } from "@/app/owner/actions";

// Owner control to pause (deactivate) or resume (activate) a building or room.
export function ActiveToggle({
  kind,
  id,
  active,
}: {
  kind: "building" | "room";
  id: string;
  active: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const toggle = () =>
    start(async () => {
      const res =
        kind === "building" ? await setBuildingActive(id, !active) : await setRoomActive(id, !active);
      if (res.ok) {
        toast.success(active ? "Paused — hidden from renters" : "Reactivated — visible again");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not update");
      }
    });

  return (
    <Button variant="ghost" size="sm" onClick={toggle} disabled={pending} title={active ? "Hide from renters" : "Make visible"}>
      {active ? <PowerOff size={14} /> : <Power size={14} />}
      {active ? "Deactivate" : "Activate"}
    </Button>
  );
}
