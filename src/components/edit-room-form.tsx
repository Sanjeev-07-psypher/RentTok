"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROOM_TYPES, AMENITIES } from "@/lib/constants";
import { Button, Input, Textarea, Select, Card } from "@/components/ui";
import { AmenityIcon } from "@/components/amenity-icon";
import { updateRoom } from "@/app/owner/actions";
import type { Room } from "@/lib/types";

const UNIT_TYPES = ROOM_TYPES.filter((t) => t.value === "single" || t.value === "shared");

export function EditRoomForm({ room }: { room: Room }) {
  const router = useRouter();
  const [amenities, setAmenities] = useState<string[]>(room.amenities ?? []);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (v: string) =>
    setAmenities((prev) => (prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v]));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateRoom({
      id: room.id,
      title: fd.get("title"),
      type: fd.get("type"),
      total_units: fd.get("total_units"),
      rent: fd.get("rent"),
      deposit: fd.get("deposit"),
      description: fd.get("description"),
      rules: fd.get("rules"),
      amenities,
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success("Saved — sent back for review");
      router.push("/owner");
      router.refresh();
    } else {
      toast.error(res.error ?? "Could not save");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <Card className="space-y-4 p-5">
        <Field label="Room label">
          <Input name="title" required defaultValue={room.title} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Room type">
            <Select name="type" required defaultValue={room.type === "shared" ? "shared" : "single"}>
              {UNIT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="How many identical rooms?">
            <Input name="total_units" type="number" min={1} max={100} required defaultValue={room.total_units ?? 1} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Rent (₹/month)">
            <Input name="rent" type="number" min={0} required defaultValue={room.rent} />
          </Field>
          <Field label="Deposit (₹)">
            <Input name="deposit" type="number" min={0} required defaultValue={room.deposit} />
          </Field>
        </div>
        <Field label="Description">
          <Textarea name="description" rows={3} defaultValue={room.description ?? ""} />
        </Field>
        <Field label="House rules">
          <Textarea name="rules" rows={2} defaultValue={room.rules ?? ""} />
        </Field>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium">Room amenities</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {AMENITIES.map((a) => {
            const active = amenities.includes(a.value);
            return (
              <button
                type="button"
                key={a.value}
                onClick={() => toggle(a.value)}
                className={
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (active
                    ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                    : "border-[var(--border)] hover:bg-[var(--surface-2)]")
                }
              >
                <AmenityIcon value={a.value} size={14} /> {a.label}
              </button>
            );
          })}
        </div>
      </Card>

      <p className="text-sm text-[var(--muted)]">
        Editing sends this listing back to admin for a quick re-verification before it goes live again.
      </p>
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
