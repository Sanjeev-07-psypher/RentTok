"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ImagePlus, X, ArrowLeft, ArrowRight, Check, Navigation, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { BUILDING_TYPES, AMENITIES, FOR_GENDER, MAX_PHOTOS } from "@/lib/constants";
import { Button, Input, Textarea, Select, Card } from "@/components/ui";
import { AmenityIcon } from "@/components/amenity-icon";
import { FloorsPicker } from "@/components/floors-picker";
import { AreaCombobox } from "@/components/area-combobox";
import { useGeolocation } from "@/components/use-geolocation";
import { reverseGeocode } from "@/lib/geocode";
import { createBuilding } from "../actions";

interface Photo {
  id: string;
  url: string;
  uploading: boolean;
}

const STEPS = ["Basics", "Location", "Details", "Amenities", "Photos"] as const;

export default function NewBuildingPage() {
  const router = useRouter();
  const { request } = useGeolocation();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Field state (controlled — persists across steps).
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("pg");
  const [forGender, setForGender] = useState<string>("any");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Gangtok");
  const [pincode, setPincode] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [floors, setFloors] = useState(2);
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);

  const toggleAmenity = (v: string) =>
    setAmenities((prev) => (prev.includes(v) ? prev.filter((a) => a !== v) : [...prev, v]));

  const phoneOk = /^(\+?91[-\s]?)?[6-9]\d{9}$/.test(contactPhone.trim());

  // Which step blocks Next until it's filled in.
  const canProceed = [
    name.trim().length >= 3,
    area.trim().length >= 2 && address.trim().length >= 4,
    phoneOk && floors >= 1,
    true, // amenities optional
    true, // photos optional
  ][step];

  async function useMyLocation() {
    setLocating(true);
    const coords = await request();
    if (!coords) {
      setLocating(false);
      toast.error("Couldn't get your location. Allow access, or type it in.");
      return;
    }
    setLat(coords.lat);
    setLng(coords.lng);
    const geo = await reverseGeocode(coords.lat, coords.lng);
    if (geo) {
      if (geo.city) setCity(geo.city);
      if (geo.pincode) setPincode(geo.pincode);
      if (!area.trim() && geo.area) setArea(geo.area);
      toast.success("Location captured — double-check the details below.");
    } else {
      toast.success("Location captured. Add the area and address below.");
    }
    setLocating(false);
  }

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
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      toast.error(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    if (files.length > room) {
      toast.error(`Only ${room} more photo${room === 1 ? "" : "s"} allowed (max ${MAX_PHOTOS}).`);
    }
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

  function next() {
    if (!canProceed) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    if (photos.some((p) => p.uploading)) {
      toast.error("Please wait for photos to finish uploading.");
      return;
    }
    setSubmitting(true);
    const result = await createBuilding({
      name,
      type,
      area,
      address,
      city,
      pincode,
      lat,
      lng,
      contact_phone: contactPhone,
      floors,
      for_gender: forGender,
      description,
      rules,
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

  const pct = Math.round(((step + 1) / STEPS.length) * 100);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">List a building</h1>
      <p className="mt-1 text-sm text-[var(--muted)]">One step at a time — it goes live after a quick review.</p>

      {/* Progress */}
      <div className="mt-6">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-[var(--primary)]">{STEPS[step]}</span>
          <span className="text-[var(--muted)]">Step {step + 1} of {STEPS.length}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div className="h-full rounded-full bg-[var(--primary)] transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <Card className="mt-6 space-y-4 p-5 sm:p-6">
        {/* Step 1 — Basics */}
        {step === 0 && (
          <>
            <Field label="Building name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Valley View Residency" autoFocus />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Type">
                <Select value={type} onChange={(e) => setType(e.target.value)}>
                  {BUILDING_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Who is it for?">
                <Select value={forGender} onChange={(e) => setForGender(e.target.value)}>
                  {FOR_GENDER.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </>
        )}

        {/* Step 2 — Location */}
        {step === 1 && (
          <>
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--primary)]/50 bg-[var(--primary)]/8 py-3 text-sm font-medium text-[var(--primary)]"
            >
              {locating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
              {locating ? "Getting your location…" : "Use my location to auto-fill city & pincode"}
            </button>

            <Field label="Area / locality">
              <AreaCombobox value={area} onChange={setArea} />
            </Field>
            <Field label="Full address">
              <Input value={address} onChange={(e) => setAddress(e.target.value)} required placeholder="Building / locality, landmark" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City">
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Gangtok" />
              </Field>
              <Field label="Pincode">
                <Input value={pincode} onChange={(e) => setPincode(e.target.value)} inputMode="numeric" placeholder="737102" />
              </Field>
            </div>
            {lat != null && (
              <p className="text-xs text-[var(--success)]">✓ Location saved — buyers near you can find this on “Near me”.</p>
            )}
          </>
        )}

        {/* Step 3 — Details */}
        {step === 2 && (
          <>
            <Field label="Contact number">
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} type="tel" required placeholder="10-digit mobile (our team calls to verify)" />
            </Field>
            <Field label="Total floors">
              <FloorsPicker value={floors} onChange={setFloors} />
            </Field>
            <Field label="Description">
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Describe the building, surroundings, who it suits…" />
            </Field>
            <Field label="House rules">
              <Textarea value={rules} onChange={(e) => setRules(e.target.value)} rows={3} placeholder="e.g. No smoking, gate closes at 10:30 PM" />
            </Field>
          </>
        )}

        {/* Step 4 — Amenities */}
        {step === 3 && (
          <>
            <p className="text-sm font-medium">Amenities</p>
            <p className="text-xs text-[var(--muted)]">Shared facilities available across the building.</p>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => {
                const active = amenities.includes(a.value);
                return (
                  <button
                    type="button"
                    key={a.value}
                    onClick={() => toggleAmenity(a.value)}
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
          </>
        )}

        {/* Step 5 — Photos */}
        {step === 4 && (
          <>
            <p className="text-sm font-medium">Photos</p>
            <p className="text-xs text-[var(--muted)]">Add clear photos — the first one is your cover. Up to {MAX_PHOTOS}.</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
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
          </>
        )}
      </Card>

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button variant="outline" onClick={back} disabled={step === 0 || submitting}>
          <ArrowLeft size={16} /> Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={next} disabled={!canProceed} size="lg">
            Next <ArrowRight size={16} />
          </Button>
        ) : (
          <Button onClick={submit} disabled={submitting} size="lg">
            <Check size={16} /> {submitting ? "Creating…" : "Create & add rooms"}
          </Button>
        )}
      </div>
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
