"use client";

import { useState } from "react";
import { Copy, Check, Gift } from "lucide-react";
import { toast } from "sonner";
import { Card } from "./ui";

// Owner's permanent referral code. Each new owner who lists with it (and gets
// approved) boosts all of this owner's buildings on the homepage.
export function ReferralCard({ code, count }: { code: string; count: number }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy — select the code and copy it manually.");
    }
  }

  return (
    <Card className="mt-6 flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
          <Gift size={18} />
        </span>
        <div>
          <p className="font-semibold">Invite other owners, get featured</p>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            When an owner lists with your code and gets approved, your buildings move up on the homepage.
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {count} successful referral{count === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-[var(--primary)] px-4 py-2 font-mono text-sm font-bold tracking-widest text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10"
        aria-label={`Copy referral code ${code}`}
      >
        {code}
        {copied ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </Card>
  );
}
