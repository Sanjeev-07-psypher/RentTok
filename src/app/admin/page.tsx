import { notFound } from "next/navigation";
import { Shield, BadgeCheck, Users, Activity, PhoneCall } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/utils";
import { BUILDING_TYPES, BOOKING_STATUS } from "@/lib/constants";
import { Card } from "@/components/ui";
import { ConnectNotice } from "@/components/connect-notice";
import { BuildingReviewActions } from "@/components/building-review-actions";
import { AadhaarReviewActions } from "@/components/aadhaar-review-actions";
import type { Building, Profile, Booking } from "@/lib/types";

export const metadata = { title: "Admin — Rent-tok" };

type PendingBuilding = Building & { owner: { full_name: string | null; phone: string | null } | null };
type BookingRow = Booking & { room: { title: string } | null; tenant: { full_name: string | null } | null };
type EventRow = { id: string; type: string; entity: string | null; created_at: string };
type CallRow = {
  id: string;
  initiated_by: string;
  status: string;
  duration_sec: number | null;
  recording_url: string | null;
  created_at: string;
  room: { title: string } | null;
  owner: { full_name: string | null } | null;
  tenant: { full_name: string | null } | null;
};

export default async function AdminPage() {
  if (!isSupabaseConfigured) return <ConnectNotice feature="Admin dashboard" />;

  const user = await getCurrentUser();
  if (!user?.profile?.is_admin) notFound();

  const supabase = await createServerSupabase();

  const [
    { data: pending },
    { data: aadhaar },
    { count: totalUsers },
    { data: ownerRows },
    { data: tenantRows },
    { data: recentBookings },
    { data: events },
    { data: calls },
  ] = await Promise.all([
    supabase
      .from("buildings")
      .select("*, owner:profiles!buildings_owner_id_fkey(full_name, phone)")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, aadhaar_last4, aadhaar_submitted_at")
      .eq("aadhaar_status", "pending")
      .order("aadhaar_submitted_at", { ascending: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("buildings").select("owner_id"),
    supabase.from("bookings").select("tenant_id"),
    supabase
      .from("bookings")
      .select("*, room:rooms(title), tenant:profiles!bookings_tenant_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("events").select("id, type, entity, created_at").order("created_at", { ascending: false }).limit(30),
    supabase
      .from("calls")
      .select("id, initiated_by, status, duration_sec, recording_url, created_at, room:rooms(title), owner:profiles!calls_owner_id_fkey(full_name), tenant:profiles!calls_tenant_id_fkey(full_name)")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const pendingBuildings = (pending as PendingBuilding[]) ?? [];
  const pendingAadhaar = (aadhaar as Partial<Profile>[]) ?? [];
  const bookingRows = (recentBookings as BookingRow[]) ?? [];
  const eventRows = (events as EventRow[]) ?? [];
  const callRows = (calls as unknown as CallRow[]) ?? [];

  // Role-derived user counts.
  const owners = new Set((ownerRows ?? []).map((r) => (r as { owner_id: string }).owner_id));
  const tenants = new Set((tenantRows ?? []).map((r) => (r as { tenant_id: string }).tenant_id));
  const activeUnion = new Set<string>([...owners, ...tenants]);
  const total = totalUsers ?? 0;
  const searchers = Math.max(0, total - activeUnion.size);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-2">
        <Shield className="text-[var(--primary)]" />
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin</h1>
      </div>

      {/* Users */}
      <h2 className="mt-8 flex items-center gap-2 text-lg font-bold">
        <Users size={18} className="text-[var(--primary)]" /> Users
      </h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-4">
        <Stat label="Total users" value={String(total)} />
        <Stat label="Owners" value={String(owners.size)} />
        <Stat label="Tenants" value={String(tenants.size)} />
        <Stat label="Searchers" value={String(searchers)} />
      </div>

      {/* Listings review */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">Buildings awaiting review</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Call the owner to confirm they own the building, then approve.</p>
        {pendingBuildings.length === 0 ? (
          <Card className="mt-3 grid place-items-center py-12 text-sm text-[var(--muted)]">Nothing to review right now.</Card>
        ) : (
          <div className="mt-3 space-y-3">
            {pendingBuildings.map((b) => (
              <Card key={b.id} className="flex flex-wrap items-start justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">
                    {BUILDING_TYPES.find((t) => t.value === b.type)?.label} · {b.area} · {timeAgo(b.created_at)}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">Owner: {b.owner?.full_name ?? "—"}</p>
                </div>
                <BuildingReviewActions
                  buildingId={b.id}
                  ownerVerified={b.owner_verified}
                  contactPhone={b.contact_phone ?? b.owner?.phone ?? null}
                />
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Aadhaar review */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <BadgeCheck size={18} className="text-[var(--primary)]" /> Aadhaar verifications
        </h2>
        {pendingAadhaar.length === 0 ? (
          <Card className="mt-3 grid place-items-center py-12 text-sm text-[var(--muted)]">No identity submissions pending.</Card>
        ) : (
          <div className="mt-3 space-y-3">
            {pendingAadhaar.map((p) => (
              <Card key={p.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div>
                  <p className="font-semibold">{p.full_name ?? p.email ?? "User"}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">
                    Aadhaar •••• {p.aadhaar_last4} · {p.phone ?? "no phone"} · submitted{" "}
                    {p.aadhaar_submitted_at ? timeAgo(p.aadhaar_submitted_at) : "—"}
                  </p>
                </div>
                <AadhaarReviewActions userId={p.id!} />
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Bookings / queue overview */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">Recent bookings &amp; queue</h2>
        <Card className="mt-3 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium">Tenant</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Queue</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {bookingRows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">No bookings yet.</td></tr>
              ) : (
                bookingRows.map((b) => (
                  <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">{b.room?.title ?? "—"}</td>
                    <td className="px-4 py-3">{b.tenant?.full_name ?? "—"}</td>
                    <td className="px-4 py-3">{BOOKING_STATUS[b.status]}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{b.queue_position ? `#${b.queue_position}` : "—"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{timeAgo(b.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Call log */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <PhoneCall size={18} className="text-[var(--primary)]" /> Call log
        </h2>
        <Card className="mt-3 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Room</th>
                <th className="px-4 py-3 font-medium">Owner ↔ Tenant</th>
                <th className="px-4 py-3 font-medium">By</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Recording</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {callRows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">No calls yet.</td></tr>
              ) : (
                callRows.map((c) => (
                  <tr key={c.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">{c.room?.title ?? "—"}</td>
                    <td className="px-4 py-3">{c.owner?.full_name ?? "?"} ↔ {c.tenant?.full_name ?? "?"}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{c.initiated_by}</td>
                    <td className="px-4 py-3">{c.status}</td>
                    <td className="px-4 py-3 text-[var(--muted)]">{c.duration_sec != null ? `${c.duration_sec}s` : "—"}</td>
                    <td className="px-4 py-3">
                      {c.recording_url ? (
                        <a href={c.recording_url} target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">Listen</a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted)]">{timeAgo(c.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      </section>

      {/* Activity log */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <Activity size={18} className="text-[var(--primary)]" /> Activity log
        </h2>
        <Card className="mt-3 divide-y divide-[var(--border)]">
          {eventRows.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">No events recorded yet.</p>
          ) : (
            eventRows.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                <span className="font-mono text-xs">{e.type}</span>
                <span className="text-[var(--muted)]">{e.entity} · {timeAgo(e.created_at)}</span>
              </div>
            ))
          )}
        </Card>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Card>
  );
}
