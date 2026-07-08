"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, CheckCircle2 } from "lucide-react";
import { Button, Input, Textarea, Select, Card } from "@/components/ui";
import { submitFeedback } from "@/app/feedback/actions";

const CATEGORIES = ["General", "Bug / something broke", "Feature request", "Listing / owner", "Other"];

export function FeedbackForm({ initialName }: { initialName?: string | null }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const res = await submitFeedback({
      name: fd.get("name"),
      category: fd.get("category"),
      message: fd.get("message"),
    });
    setSubmitting(false);
    // Remember that they've given feedback so the prompt stops nudging them.
    try {
      localStorage.setItem("rt_feedback_done", "1");
    } catch {}
    if (res.ok) {
      setDone(true);
      toast.success("Thank you! Your feedback reached the team.");
    } else {
      toast.error(res.error ?? "Could not send");
    }
  }

  if (done) {
    return (
      <Card className="mt-6 grid place-items-center gap-2 py-14 text-center">
        <CheckCircle2 size={40} className="text-[var(--success)]" />
        <p className="font-semibold">Thanks for helping us improve RentTok 🙏</p>
        <p className="text-sm text-[var(--muted)]">We read every note.</p>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name (optional)">
            <Input name="name" defaultValue={initialName ?? ""} placeholder="So we can thank you" />
          </Field>
          <Field label="Topic">
            <Select name="category" defaultValue={CATEGORIES[0]}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Your feedback">
          <Textarea name="message" rows={5} required placeholder="What's working, what's confusing, what you'd love to see…" />
        </Field>
      </Card>
      <Button type="submit" size="lg" className="w-full" disabled={submitting}>
        <MessageSquare size={16} /> {submitting ? "Sending…" : "Send feedback"}
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
