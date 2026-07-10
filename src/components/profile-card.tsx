"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X, Mail, Phone, MapPin } from "lucide-react";
import { Button, Input, Textarea, Card } from "@/components/ui";
import { genderLabel } from "@/lib/constants";
import { updateContactInfo } from "@/app/account/actions";

export interface ProfileCardData {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  age: number | null;
  gender: string | null;
  guardianName: string | null;
  phone: string | null;
  address: string | null;
  detailsComplete: boolean;
}

export function ProfileCard(p: ProfileCardData) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const initial = (p.name ?? p.email ?? "U").charAt(0).toUpperCase();

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateContactInfo({
      phone: fd.get("phone"),
      permanent_address: fd.get("permanent_address"),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Profile updated");
      setEditing(false);
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not update");
    }
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        {p.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.avatarUrl}
            alt=""
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-[var(--border)] sm:h-20 sm:w-20"
          />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-2xl font-bold text-[var(--primary-foreground)] ring-2 ring-[var(--border)] sm:h-20 sm:w-20">
            {initial}
          </div>
        )}

        {/* Identity + details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{p.name ?? "Your profile"}</h1>
              {p.email && (
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-[var(--muted)]">
                  <Mail size={13} className="shrink-0" /> {p.email}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Info label="Age" value={p.age != null ? String(p.age) : null} />
            <Info label="Gender" value={genderLabel(p.gender) || null} />
            <Info label="Guardian" value={p.guardianName} />
            <Info label="Phone" value={p.phone} icon={<Phone size={12} />} />
            <Info label="Address" value={p.address} icon={<MapPin size={12} />} className="col-span-2 sm:col-span-3" />
          </div>

          {!p.detailsComplete && (
            <p className="mt-4 rounded-lg bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
              Some details are missing.{" "}
              <Link href="/account/details" className="font-medium text-[var(--primary)] hover:underline">
                Complete your profile
              </Link>{" "}
              so owners and tenants can reach you.
            </p>
          )}
        </div>
      </div>

      {/* Edit modal — phone + address only */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold">Edit contact details</p>
              <button onClick={() => setEditing(false)} aria-label="Close" className="text-[var(--muted)]">
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Update your phone number and address. Other details stay as they are.
            </p>

            <form onSubmit={onSave} className="mt-4 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Phone number</span>
                <Input name="phone" type="tel" required defaultValue={p.phone ?? ""} placeholder="10-digit mobile" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Address</span>
                <Textarea name="permanent_address" rows={3} required defaultValue={p.address ?? ""} placeholder="Your address" />
              </label>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Card>
  );
}

function Info({
  label,
  value,
  icon,
  className = "",
}: {
  label: string;
  value: string | null;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
        {value ? (
          <>
            {icon && <span className="text-[var(--muted)]">{icon}</span>}
            <span className="break-words">{value}</span>
          </>
        ) : (
          <span className="text-[var(--muted)]">—</span>
        )}
      </p>
    </div>
  );
}
