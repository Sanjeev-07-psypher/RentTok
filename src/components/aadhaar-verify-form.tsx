"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Clock, Upload, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { Button, Input, Card } from "@/components/ui";
import { submitAadhaar } from "@/app/account/actions";
import type { AadhaarStatus } from "@/lib/types";

export function AadhaarVerifyForm({
  status,
  last4,
}: {
  status: AadhaarStatus;
  last4: string | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [last4Input, setLast4Input] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (status === "verified") {
    return (
      <Card className="mt-6 flex items-start gap-3 p-5">
        <ShieldCheck className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" />
        <div>
          <p className="font-semibold">Your identity is verified</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Aadhaar ending in •••• {last4}. You&apos;re all set to list and book.
          </p>
        </div>
      </Card>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) return toast.error("Connect Supabase to submit.");
    if (!file) return toast.error("Choose a photo of your Aadhaar card.");
    if (!/^\d{4}$/.test(last4Input)) return toast.error("Enter the last 4 digits of your Aadhaar.");

    setSubmitting(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in.");
        return;
      }
      const ext = file.name.split(".").pop()?.replace(/[^\w]/g, "") || "jpg";
      const path = `${user.id}/aadhaar-${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("aadhaar-docs").upload(path, file, {
        cacheControl: "0",
        upsert: false,
      });
      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}`);
        return;
      }
      const res = await submitAadhaar({ path, last4: last4Input });
      if (res.ok) {
        toast.success("Submitted for verification. We'll review it shortly.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not submit");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {status === "pending" && (
        <Card className="mt-6 flex items-start gap-3 p-5">
          <Clock className="mt-0.5 shrink-0 text-yellow-500" />
          <div>
            <p className="font-semibold">Verification in progress</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              We received your Aadhaar ending in •••• {last4}. A team member will verify it manually.
              You can re-submit below if you uploaded the wrong photo.
            </p>
          </div>
        </Card>
      )}

      {status === "rejected" && (
        <Card className="mt-6 flex items-start gap-3 p-5">
          <ShieldAlert className="mt-0.5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold">Verification was rejected</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              The photo couldn&apos;t be verified. Please upload a clear photo of your Aadhaar card and try again.
            </p>
          </div>
        </Card>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <Card className="space-y-4 p-5">
          <div className="flex items-start gap-2 rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--muted)]">
            <Lock size={15} className="mt-0.5 shrink-0 text-[var(--primary)]" />
            <span>
              Your Aadhaar photo is stored privately and is visible only to our admin for manual
              verification — it is deleted right after. We keep only the last 4 digits on file.
            </span>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Aadhaar card photo (front)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-[var(--muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--primary)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--primary-foreground)]"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Last 4 digits of Aadhaar</span>
            <Input
              inputMode="numeric"
              maxLength={4}
              placeholder="1234"
              value={last4Input}
              onChange={(e) => setLast4Input(e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </label>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          <Upload size={16} /> {submitting ? "Submitting…" : "Submit for verification"}
        </Button>
      </form>
    </>
  );
}
