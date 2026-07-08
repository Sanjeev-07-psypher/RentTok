"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";

const VISITS_KEY = "rt_visits";
const COUNTED_KEY = "rt_visit_counted"; // sessionStorage — one count per browser session
const DONE_KEY = "rt_feedback_done"; // set once they engage/dismiss for good

// Gentle nudge for feedback on a returning visitor's 2nd and 3rd visit.
export function FeedbackPrompt() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let visits = 0;
    try {
      if (localStorage.getItem(DONE_KEY)) return; // already gave feedback / opted out
      // Count this visit once per session.
      if (!sessionStorage.getItem(COUNTED_KEY)) {
        visits = Number(localStorage.getItem(VISITS_KEY) || 0) + 1;
        localStorage.setItem(VISITS_KEY, String(visits));
        sessionStorage.setItem(COUNTED_KEY, "1");
      } else {
        visits = Number(localStorage.getItem(VISITS_KEY) || 0);
      }
    } catch {
      return;
    }

    // Only on the 2nd or 3rd visit, and never on the feedback page itself.
    if ((visits === 2 || visits === 3) && pathname !== "/feedback") {
      const t = setTimeout(() => setShow(true), 2500);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  if (!show || pathname === "/feedback") return null;

  function dismiss() {
    setShow(false);
    try {
      // Snooze only for this visit-count; if they don't engage it may return next
      // visit. Mark done so we stop after they explicitly close it twice-ish.
      localStorage.setItem(DONE_KEY, "1");
    } catch {}
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)] sm:left-auto sm:right-4">
      <button onClick={dismiss} aria-label="Dismiss" className="absolute right-3 top-3 text-[var(--muted)]">
        <X size={18} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary)]/12 text-[var(--primary)]">
          <MessageSquare size={18} />
        </div>
        <div>
          <p className="text-sm font-semibold">Enjoying RentTok?</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Tell us what to improve — it takes a minute and really helps our small team.
          </p>
          <Link
            href="/feedback"
            onClick={() => setShow(false)}
            className="mt-2 inline-block rounded-full bg-[var(--primary)] px-3.5 py-1.5 text-xs font-semibold text-[var(--primary-foreground)]"
          >
            Share feedback
          </Link>
        </div>
      </div>
    </div>
  );
}
