import { MessageSquare, Heart, QrCode } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui";
import { FeedbackForm } from "@/components/feedback-form";

export const metadata = {
  title: "Feedback & support — RentTok",
  description: "Tell the RentTok team what you think, and support us if you'd like.",
};

export default async function FeedbackPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
        <MessageSquare size={24} className="text-[var(--primary)]" /> Help us make RentTok better
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        We&apos;re a small team building this for Gangtok. Your feedback shapes what we build next —
        tell us anything, good or bad.
      </p>

      <FeedbackForm initialName={user?.profile?.full_name ?? null} />

      {/* Donate / support */}
      <Card className="mt-8 p-6 text-center">
        <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-[var(--primary)]/12 text-[var(--primary)]">
          <Heart size={20} />
        </div>
        <h2 className="mt-3 text-lg font-bold">Support RentTok</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[var(--muted)]">
          RentTok is free to use. If it helped you find a room, a small tip helps us keep the lights on
          and onboard more buildings.
        </p>

        {/* UPI QR placeholder — real QR drops in here later */}
        <div className="mx-auto mt-5 grid h-44 w-44 place-items-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)]">
          <div className="flex flex-col items-center gap-2">
            <QrCode size={40} />
            <span className="text-xs font-medium">UPI QR coming soon</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)]">Scan-to-pay will appear here. Thank you for the love 🧡</p>
      </Card>
    </div>
  );
}
