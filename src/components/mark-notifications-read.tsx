"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsRead } from "@/app/account/actions";

// Marks the inbox read when the page opens, then refreshes so the navbar badge clears.
export function MarkNotificationsRead({ hasUnread }: { hasUnread: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!hasUnread) return;
    void markNotificationsRead().then(() => router.refresh());
  }, [hasUnread, router]);
  return null;
}
