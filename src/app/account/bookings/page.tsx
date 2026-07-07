import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isCallingConfigured } from "@/lib/calling";
import { getCurrentUser } from "@/lib/auth";
import { BOOKING_STATUS } from "@/lib/constants";
import { formatINR, timeAgo } from "@/lib/utils";
import { Card } from "@/components/ui";
import { ConnectNotice } from "@/components/connect-notice";
import { TenantBookingActions } from "@/components/tenant-booking-actions";
import { CallButton } from "@/components/call-button";
import type { Booking } from "@/lib/types";

export const metadata = { title: "My bookings — Rent-tok" };

const statusColor: Record<string, string> = {
  queued: "text-[var(--primary)]",
  accepted: "text-[var(--primary)]",
  confirmed: "text-[var(--success)]",
  rejected: "text-[var(--muted)]",
  cancelled: "text-[var(--muted)]",
  refunded: "text-[var(--muted)]",
};

export default async function BookingsPage() {
  if (!isSupabaseConfigured) return <ConnectNotice feature="My bookings" />;

  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  const { data } = await supabase
    .from("bookings")
    .select("*, room:rooms(*)")
    .eq("tenant_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  const bookings = (data as Booking[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold">My bookings</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Rooms you&apos;ve requested - free. Your request holds your spot in the owner&apos;s queue
        until they respond.
      </p>

      {bookings.length === 0 ? (
        <Card className="mt-6 grid place-items-center py-20 text-center">
          <CalendarCheck size={36} className="text-[var(--muted)]" />
          <p className="mt-3 font-medium">No bookings yet</p>
          <Link href="/search" className="mt-1 text-sm text-[var(--primary)] hover:underline">
            Browse rooms
          </Link>
        </Card>
      ) : (
        <div className="mt-6 space-y-3">
          {bookings.map((b) => (
            <Card key={b.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <Link href={`/rooms/${b.room_id}`} className="font-semibold hover:underline">
                  {b.room?.title ?? "Room"}
                </Link>
                <p className="text-sm text-[var(--muted)]">
                  {b.room?.area} · {b.room ? formatINR(b.room.rent) : ""}/mo · requested {timeAgo(b.created_at)}
                </p>
                <p className={`mt-1 text-sm font-medium ${statusColor[b.status] ?? "text-[var(--muted)]"}`}>
                  {BOOKING_STATUS[b.status]}
                  {b.status === "queued" && b.queue_position ? ` · #${b.queue_position} in queue` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {(b.status === "accepted" || b.status === "confirmed") && (
                  <CallButton bookingId={b.id} label="Call owner" enabled={isCallingConfigured} />
                )}
                <TenantBookingActions
                  bookingId={b.id}
                  status={b.status}
                  confirmedByTenant={b.confirmed_by_tenant}
                  confirmedByOwner={b.confirmed_by_owner}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
