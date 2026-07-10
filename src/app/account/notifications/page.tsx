import Link from "next/link";
import { Bell, CheckCircle2, XCircle, Info, ChevronRight } from "lucide-react";
import { getNotifications } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { timeAgo } from "@/lib/utils";
import { Card } from "@/components/ui";
import { ConnectNotice } from "@/components/connect-notice";
import { MarkNotificationsRead } from "@/components/mark-notifications-read";
import { PushOptIn } from "@/components/push-opt-in";

export const metadata = { title: "Notifications — RentTok" };

function icon(type: string) {
  if (type === "listing_approved") return <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />;
  if (type === "listing_rejected") return <XCircle size={18} className="text-red-500" />;
  return <Info size={18} className="text-[var(--primary)]" />;
}

export default async function NotificationsPage() {
  if (!isSupabaseConfigured) return <ConnectNotice feature="Notifications" />;

  const user = await getCurrentUser();
  if (!user) return <SignInPrompt />;

  const notifications = await getNotifications();
  const hasUnread = notifications.some((n) => !n.read);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <MarkNotificationsRead hasUnread={hasUnread} />
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <Bell size={22} className="text-[var(--primary)]" /> Notifications
      </h1>

      <PushOptIn />

      {notifications.length === 0 ? (
        <Card className="mt-6 grid place-items-center py-20 text-center">
          <Bell size={36} className="text-[var(--muted)]" />
          <p className="mt-3 font-medium">No notifications yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Updates about your listings will show up here.</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {notifications.map((n) => {
            const inner = (
              <>
                <span className="mt-0.5 shrink-0">{icon(n.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-[var(--muted)]">{n.body}</p>}
                  <p className="mt-1 text-xs text-[var(--muted)]">{timeAgo(n.created_at)}</p>
                </div>
                {n.link && <ChevronRight size={18} className="mt-0.5 shrink-0 text-[var(--muted)]" />}
              </>
            );
            const base = `flex items-start gap-3 p-4 ${n.read ? "" : "border-[var(--primary)]/40"}`;
            return n.link ? (
              <Link key={n.id} href={n.link} className="block">
                <Card className={`${base} transition-colors hover:border-[var(--primary)]`}>{inner}</Card>
              </Link>
            ) : (
              <Card key={n.id} className={base}>{inner}</Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <Bell size={36} className="mx-auto text-[var(--muted)]" />
      <p className="mt-3 font-medium">Sign in to see your notifications</p>
      <Link href="/login" className="mt-2 inline-block text-sm text-[var(--primary)] hover:underline">
        Go to sign in
      </Link>
    </div>
  );
}
