import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, ShieldCheck } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isCallingConfigured } from "@/lib/calling";
import { getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import { Card } from "@/components/ui";
import { ConnectNotice } from "@/components/connect-notice";
import { BookingActions } from "@/components/booking-actions";
import { CallButton } from "@/components/call-button";
import type { Booking, Profile, Room } from "@/lib/types";

export default async function RoomRequestsPage(props: PageProps<"/owner/rooms/[id]">) {
  if (!isSupabaseConfigured) return <ConnectNotice feature="Tenant requests" />;

  const { id } = await props.params;
  const user = await getCurrentUser();
  const supabase = await createServerSupabase();

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user?.id ?? "")
    .single();
  if (!room) notFound();
  const r = room as Room;

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, tenant:profiles(*)")
    .eq("room_id", id)
    .order("created_at", { ascending: true });

  const queue = (bookings as (Booking & { tenant: Profile | null })[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/owner" className="inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={15} /> Back to listings
      </Link>

      <h1 className="mt-3 text-2xl font-bold">{r.title}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--muted)]">
        <Users size={15} /> {queue.length} tenant{queue.length === 1 ? "" : "s"} in queue
      </p>
      <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
        <ShieldCheck size={14} className="text-[var(--primary)]" /> Numbers are private — once you accept a
        request you can connect over a free, recorded in-app call.
      </p>

      {queue.length === 0 ? (
        <Card className="mt-8 grid place-items-center py-16 text-center text-[var(--muted)]">
          No requests yet. Approved listings start collecting requests automatically.
        </Card>
      ) : (
        <ol className="mt-6 space-y-3">
          {queue.map((b, i) => {
            const canCall = b.status === "accepted" || b.status === "confirmed";
            const details = [b.tenant?.age ? `Age ${b.tenant.age}` : null, b.tenant?.guardian_name ? `Guardian: ${b.tenant.guardian_name}` : null]
              .filter(Boolean)
              .join(" · ");
            return (
              <Card key={b.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-2)] text-sm font-semibold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-medium">{b.tenant?.full_name ?? "Tenant"}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {details ? `${details} · ` : ""}requested {timeAgo(b.created_at)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {canCall && <CallButton bookingId={b.id} label="Call tenant" enabled={isCallingConfigured} />}
                  <BookingActions
                    bookingId={b.id}
                    status={b.status}
                    confirmedByOwner={b.confirmed_by_owner}
                    confirmedByTenant={b.confirmed_by_tenant}
                  />
                </div>
              </Card>
            );
          })}
        </ol>
      )}
    </div>
  );
}
