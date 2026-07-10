"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BUILDING_TYPES, AREAS, AMENITIES, FOR_GENDER } from "@/lib/constants";
import { Button, Input, Textarea, Select, Card } from "@/components/ui";
import { AmenityIcon } from "@/components/amenity-icon";
import { FloorsPicker } from "@/components/floors-picker";
import { updateBuilding } from "@/app/owner/actions";
import type { Building } from "@/lib/types";

export function EditBuildingForm({ building }: { building: Building }) {
  const router = useRouter();
  const [amenities, setAmenities] = useState<string[]>(building.amenities ?? []);
  const [floors, setFloors] = useState(building.floors && building.floors > 0 ? building.floors : 1);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (v: string) =>
    setAmenities((prev) => (prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v]));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateBuilding({
      id: building.id,
      name: fd.get("name"),
      type: fd.get("type"),
      area: fd.get("area"),
      address: fd.get("address"),
      contact_phone: fd.get("contact_phone"),
      floors,
      for_gender: fd.get("for_gender"),
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
        <Field label="Building name">
          <Input name="name" required defaultValue={building.name} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select name="type" required defaultValue={building.type}>
              {BUILDING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Area">
            <Select name="area" required defaultValue={building.area}>
              {AREAS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Full address">
          <Input name="address" required defaultValue={building.address} />
        </Field>
        <Field label="Contact number">
          <Input name="contact_phone" type="tel" required defaultValue={building.contact_phone ?? ""} />
        </Field>
        <Field label="Who is it for?">
          <Select name="for_gender" defaultValue={building.for_gender ?? "any"}>
            {FOR_GENDER.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Total floors">
          <FloorsPicker value={floors} onChange={setFloors} />
        </Field>
        <Field label="Description">
          <Textarea name="description" rows={4} defaultValue={building.description ?? ""} />
        </Field>
        <Field label="House rules">
          <Textarea
            name="rules"
            rows={3}
            defaultValue={building.rules ?? ""}
            placeholder="e.g. No smoking, gate closes at 10:30 PM"
          />
        </Field>
      </Card>

      <Card className="p-5">
        <p className="text-sm font-medium">Amenities</p>
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
