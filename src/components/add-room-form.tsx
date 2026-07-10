"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, X, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { AMENITIES, MAX_PHOTOS } from "@/lib/constants";
import { Button, Input, Textarea, Card } from "@/components/ui";
import { AmenityIcon } from "@/components/amenity-icon";
import { BhkPicker } from "@/components/bhk-picker";
import { RoomFloorSelect } from "@/components/room-floor-select";
import { addRoom } from "@/app/owner/actions";

interface Photo {
  id: string;
  url: string;
  uploading: boolean;
}

export function AddRoomForm({
  buildingId,
  buildingName,
  buildingFloors,
  isFirst,
}: {
  buildingId: string;
  buildingName: string;
  buildingFloors?: number | null;
  isFirst: boolean;
}) {
  const router = useRouter();
  const [amenities, setAmenities] = useState<string[]>([]);
  const [bhk, setBhk] = useState(1);
  const [floor, setFloor] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [added, setAdded] = useState(0);
  const [formKey, setFormKey] = useState(0); // bump to reset uncontrolled inputs

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
        const { error } = await supabase.storage.from("room-photos").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) {
          toast.error(`Upload failed: ${error.message}`);
          setPhotos((p) => p.filter((ph) => ph.id !== id));
          return;
        }
        const { data } = supabase.storage.from("room-photos").getPublicUrl(path);
        setPhotos((p) => p.map((ph) => (ph.id === id ? { ...ph, url: data.publicUrl, uploading: false } : ph)));
      })
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const result = await addRoom({
      building_id: buildingId,
      title: fd.get("title"),
      bhk,
      floor,
      total_units: fd.get("total_units"),
      rent: fd.get("rent"),
      deposit: fd.get("deposit"),
      description: fd.get("description"),
      amenities,
      photoUrls: photos.filter((p) => p.url).map((p) => p.url),
    });
    setSubmitting(false);

    if (result.ok) {
      toast.success("Room added.");
      setAdded((n) => n + 1);
      setAmenities([]);
      setBhk(1);
      setFloor(0);
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
            <Input name="title" required placeholder="e.g. 2 BHK · 1st floor" />
          </Field>
          <Field label="Room type (BHK)">
            <BhkPicker value={bhk} onChange={setBhk} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Floor">
              <RoomFloorSelect value={floor} onChange={setFloor} buildingFloors={buildingFloors} />
            </Field>
            <Field label="How many identical rooms of this type?">
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
          <p className="text-xs text-[var(--muted)]">
            House rules are set once on the building and apply to every room.
          </p>
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
          <p className="mt-2 text-xs text-[var(--muted)]">Up to {MAX_PHOTOS} photos.</p>
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
