"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Textarea, Select, Card } from "@/components/ui";
import { GENDERS } from "@/lib/constants";
import { saveTenantDetails } from "@/app/account/actions";
import { requestBooking } from "@/app/bookings/actions";

interface Initial {
  full_name?: string | null;
  phone?: string | null;
  age?: number | null;
  gender?: string | null;
  permanent_address?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
}

export function TenantDetailsForm({
  initial,
  next,
  bookRoomId,
}: {
  initial: Initial;
  next?: string;
  bookRoomId?: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const res = await saveTenantDetails({
      full_name: fd.get("full_name"),
      phone: fd.get("phone"),
      age: fd.get("age"),
      gender: fd.get("gender"),
      permanent_address: fd.get("permanent_address"),
      guardian_name: fd.get("guardian_name"),
      guardian_phone: fd.get("guardian_phone"),
    });

    if (!res.ok) {
      setSubmitting(false);
      toast.error(res.error ?? "Could not save");
      return;
    }

    // Came here from a "Request to rent" click → save the details AND send the
    // booking in one go, so the user never has to come back and click again.
    if (bookRoomId) {
      const booking = await requestBooking(bookRoomId);
      setSubmitting(false);
      if (booking.ok) {
        toast.success("Saved and requested to book! The owner will reach out.");
        router.push("/account/bookings");
        router.refresh();
      } else {
        toast.error(booking.error);
        router.push(`/rooms/${bookRoomId}`);
      }
      return;
    }

    setSubmitting(false);
    toast.success("Details saved");
    router.push(next || "/account/bookings");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-6">
      <Card className="space-y-4 p-5">
        <Field label="Full name">
          <Input name="full_name" required defaultValue={initial.full_name ?? ""} placeholder="As on your ID" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Age">
            <Input name="age" type="number" min={16} max={120} required defaultValue={initial.age ?? ""} placeholder="20" />
          </Field>
          <Field label="Gender">
            <Select name="gender" required defaultValue={initial.gender ?? ""}>
              <option value="" disabled>Select…</option>
              {GENDERS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Phone number">
          <Input name="phone" type="tel" required defaultValue={initial.phone ?? ""} placeholder="10-digit mobile" />
        </Field>
        <Field label="Permanent address">
          <Textarea name="permanent_address" rows={3} required defaultValue={initial.permanent_address ?? ""} placeholder="Home town address" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Guardian's name">
            <Input name="guardian_name" required defaultValue={initial.guardian_name ?? ""} placeholder="Parent / guardian" />
          </Field>
          <Field label="Guardian's contact">
            <Input name="guardian_phone" type="tel" required defaultValue={initial.guardian_phone ?? ""} placeholder="10-digit mobile" />
          </Field>
        </div>
      </Card>

      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        {submitting
          ? bookRoomId
            ? "Saving & requesting…"
            : "Saving…"
          : bookRoomId
            ? "Save & request to rent"
            : "Save details"}
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
