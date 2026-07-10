"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { BUILDING_TYPES, AREAS, AMENITIES, FOR_GENDER, MAX_PHOTOS } from "@/lib/constants";
import { Button, Input, Textarea, Select, Card } from "@/components/ui";
import { AmenityIcon } from "@/components/amenity-icon";
import { FloorsPicker } from "@/components/floors-picker";
import { createBuilding } from "../actions";

interface Photo {
  id: string;
  url: string;
  uploading: boolean;
}

export default function NewBuildingPage() {
  const router = useRouter();
  const [amenities, setAmenities] = useState<string[]>([]);
  const [floors, setFloors] = useState(2);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (v: string) =>
    setAmenities((prev) => (prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v]));

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
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

    // Enforce the photo cap (count what's already added/uploading).
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    if (files.length > room) {
      toast.error(`Only ${room} more photo${room === 1 ? "" : "s"} allowed (max ${MAX_PHOTOS}).`);
    }

    // Upload in parallel; each placeholder is tracked by a stable id so results
    // never overwrite each other (the old index-based approach lost all but one).
    await Promise.all(
      files.slice(0, room).map(async (file) => {
        const id = crypto.randomUUID();
        setPhotos((p) => [...p, { id, url: "", uploading: true }]);
        const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error } = await supabase.storage.from("building-photos").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) {
          toast.error(`Upload failed: ${error.message}`);
          setPhotos((p) => p.filter((ph) => ph.id !== id));
          return;
        }
        const { data } = supabase.storage.from("building-photos").getPublicUrl(path);
        setPhotos((p) => p.map((ph) => (ph.id === id ? { ...ph, url: data.publicUrl, uploading: false } : ph)));
      })
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const result = await createBuilding({
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
      photoUrls: photos.filter((p) => p.url).map((p) => p.url),
    });
    setSubmitting(false);

    if (result.ok) {
      toast.success("Building created! Now add your rooms.");
      router.push(`/owner/buildings/${result.id}/rooms/new?first=1`);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">List a building</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Add the property first (PG, hostel, flat or house). You&apos;ll add individual rooms next.
        It goes live after a quick review.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        <Card className="space-y-4 p-5">
          <Field label="Building name">
            <Input name="name" required placeholder="e.g. Valley View Residency" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type">
              <Select name="type" required defaultValue="pg">
                {BUILDING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Area">
              <Select name="area" required defaultValue={AREAS[0]}>
                {AREAS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Full address">
            <Input name="address" required placeholder="Building / locality, landmark" />
          </Field>
          <Field label="Contact number">
            <Input name="contact_phone" type="tel" required placeholder="10-digit mobile (our team calls to verify)" />
          </Field>
          <Field label="Who is it for?">
            <Select name="for_gender" defaultValue="any">
              {FOR_GENDER.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Total floors">
            <FloorsPicker value={floors} onChange={setFloors} />
          </Field>
          <Field label="Description">
            <Textarea name="description" rows={4} placeholder="Describe the building, surroundings, who it suits…" />
          </Field>
          <Field label="House rules">
            <Textarea name="rules" rows={3} placeholder="e.g. No smoking, gate closes at 10:30 PM, no loud music after 9 PM" />
          </Field>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-medium">Amenities</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">Shared facilities available across the building.</p>
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
          <p className="text-sm font-medium">Photos</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Add a few clear photos of the building — the first one is your cover.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-2)]">
                {p.uploading ? (
                  <div className="grid h-full place-items-center text-xs text-[var(--muted)]">Uploading…</div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((ph) => ph.id !== p.id))}
                      className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"
                    >
                      <X size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="grid aspect-square cursor-pointer place-items-center rounded-xl border border-dashed border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-2)]">
                <ImagePlus size={22} />
                <input type="file" accept="image/*" multiple className="hidden" onChange={onFiles} />
              </label>
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">Up to {MAX_PHOTOS} photos — the first is your cover.</p>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting ? "Creating…" : "Create building & add rooms"}
        </Button>
      </form>
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
