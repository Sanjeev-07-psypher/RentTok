"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, X, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ROOM_TYPES, AMENITIES } from "@/lib/constants";
import { Button, Input, Textarea, Select, Card } from "@/components/ui";
import { AmenityIcon } from "@/components/amenity-icon";
import { addRoom } from "@/app/owner/actions";

interface Photo {
  url: string;
  uploading: boolean;
}

// Only single/shared are valid room-unit kinds.
const UNIT_TYPES = ROOM_TYPES.filter((t) => t.value === "single" || t.value === "shared");

export function AddRoomForm({
  buildingId,
  buildingName,
  isFirst,
}: {
  buildingId: string;
  buildingName: string;
  isFirst: boolean;
}) {
  const router = useRouter();
  const [amenities, setAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [added, setAdded] = useState(0);
  const [formKey, setFormKey] = useState(0); // bump to reset uncontrolled inputs

  const toggle = (v: string) =>
    setAmenities((prev) => (prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v]));

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (!isSupabaseConfigured) {
      toast.error("Connect Supabase to upload photos.");
      return;
    }
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in.");
      return;
    }

    for (const file of files) {
      const idx = photos.length;
      setPhotos((p) => [...p, { url: "", uploading: true }]);
      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("room-photos").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        setPhotos((p) => p.filter((_, i) => i !== idx));
        continue;
      }
      const { data } = supabase.storage.from("room-photos").getPublicUrl(path);
      setPhotos((p) => p.map((ph, i) => (i === idx ? { url: data.publicUrl, uploading: false } : ph)));
    }
    e.target.value = "";
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const result = await addRoom({
      building_id: buildingId,
      title: fd.get("title"),
      type: fd.get("type"),
      total_units: fd.get("total_units"),
      rent: fd.get("rent"),
      deposit: fd.get("deposit"),
      description: fd.get("description"),
      rules: fd.get("rules"),
      amenities,
      photoUrls: photos.filter((p) => p.url).map((p) => p.url),
    });
    setSubmitting(false);

    if (result.ok) {
      toast.success("Room added.");
      setAdded((n) => n + 1);
      setAmenities([]);
      setPhotos([]);
      setFormKey((k) => k + 1);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Add a room</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Adding rooms to <span className="font-medium text-[var(--foreground)]">{buildingName}</span>.
        {added > 0 && <span className="text-[var(--primary)]"> {added} added so far.</span>}
      </p>

      <form key={formKey} onSubmit={onSubmit} className="mt-8 space-y-6">
        <Card className="space-y-4 p-5">
          <Field label="Room label">
            <Input name="title" required placeholder="e.g. Single Room · 1st floor" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Room type">
              <Select name="type" required defaultValue="single">
                {UNIT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="How many identical rooms?">
              <Input name="total_units" type="number" min={1} max={100} required defaultValue={1} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Rent (₹/month)">
              <Input name="rent" type="number" required min={0} placeholder="6000" />
            </Field>
            <Field label="Deposit (₹)">
              <Input name="deposit" type="number" required min={0} placeholder="6000" />
            </Field>
          </div>
          <Field label="Description">
            <Textarea name="description" rows={3} placeholder="Anything specific to this room…" />
          </Field>
          <Field label="House rules">
            <Textarea name="rules" rows={2} placeholder="e.g. No smoking, gate closes at 10:30 PM" />
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

        <Card className="p-5">
          <p className="text-sm font-medium">Room photos</p>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((p, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
                {p.uploading ? (
                  <div className="grid h-full place-items-center text-xs text-[var(--muted)]">Uploading…</div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
            <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]">
              <ImagePlus size={22} />
              <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
            </label>
          </div>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Adding…" : "Add room"}
          </Button>
          {(added > 0 || !isFirst) && (
            <Button type="button" variant="outline" size="lg" onClick={() => router.push("/owner")}>
              Done <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </form>

      <Link href="/owner" className="mt-6 inline-block text-sm text-[var(--muted)] hover:underline">
        ← Back to dashboard
      </Link>
    </div>
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
