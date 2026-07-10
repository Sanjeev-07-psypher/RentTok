"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Button } from "./ui";

const KEY = "rt_terms_accepted";

// One-time Terms & Conditions acceptance. Shown until the visitor accepts;
// acceptance is remembered locally (v1). The page renders behind it, so accepting
// simply unblocks — nothing is lost.
export function TermsGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        const t = setTimeout(() => setShow(true), 600);
        return () => clearTimeout(t);
      }
    } catch {
      /* storage blocked — skip the gate */
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {}
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-lg)]">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[var(--primary)]/12 text-[var(--primary)]">
          <ShieldCheck size={24} />
        </div>
        <h2 className="mt-3 text-lg font-bold">Welcome to RentTok</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--muted)]">
          Before you continue, please review and accept our{" "}
          <Link href="/terms" className="font-medium text-[var(--primary)] hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-[var(--primary)] hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <Button onClick={accept} size="lg" className="mt-5 w-full">
          Accept &amp; continue
        </Button>
        <p className="mt-2 text-xs text-[var(--muted)]">By continuing you agree to these terms.</p>
      </div>
    </div>
  );
}
