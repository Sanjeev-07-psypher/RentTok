"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellRing } from "lucide-react";
import { Button, Card } from "./ui";
import { savePushSubscription } from "@/app/account/actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlB64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type Status = "loading" | "unsupported" | "default" | "granted" | "denied";

// Prompt the signed-in user to enable browser/OS (Chrome) push notifications.
export function PushOptIn() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission as Status);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm as Status);
      if (perm !== "granted") {
        toast.error("Notifications are blocked. You can enable them in your browser settings.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID),
        });
      }
      const json = sub.toJSON();
      const res = await savePushSubscription({
        endpoint: sub.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (res.ok) toast.success("Notifications enabled 🔔");
      else toast.error(res.error ?? "Could not enable notifications.");
    } catch {
      toast.error("Could not enable notifications on this device.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading" || status === "unsupported") return null;

  if (status === "granted") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--success)]">
        <BellRing size={16} /> Browser notifications are on for this device.
      </div>
    );
  }

  return (
    <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary)]/12 text-[var(--primary)]">
          <Bell size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold">Turn on notifications</p>
          <p className="text-xs text-[var(--muted)]">
            {status === "denied"
              ? "Notifications are blocked — allow them in your browser’s site settings, then reload."
              : "Get booking updates instantly, even when RentTok isn’t open."}
          </p>
        </div>
      </div>
      {status !== "denied" && (
        <Button size="sm" onClick={enable} disabled={busy}>
          {busy ? "Enabling…" : "Enable"}
        </Button>
      )}
    </Card>
  );
}
