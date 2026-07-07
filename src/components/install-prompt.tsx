"use client";

import { useEffect, useState } from "react";
import { X, Download, Share } from "lucide-react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

const DISMISS_KEY = "rt_install_dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    // Register the service worker (enables installability + offline shell).
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    if (!isMobile || isStandalone || dismissed) return;

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS Safari has no beforeinstallprompt → show manual instructions.
    if (isIOS) {
      setIosHint(true);
      setShow(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, "1");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    dismiss();
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)] sm:hidden">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-[var(--muted)]"
      >
        <X size={18} />
      </button>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon.svg" alt="" className="h-11 w-11 rounded-xl" />
        <div className="pr-6">
          <p className="text-sm font-semibold">Install the Rent-tok app</p>
          {iosHint ? (
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Tap <Share size={12} className="inline" /> Share, then &ldquo;Add to Home Screen&rdquo;.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-[var(--muted)]">Faster access, right from your home screen.</p>
          )}
        </div>
      </div>
      {!iosHint && (
        <button
          onClick={install}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--primary)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"
        >
          <Download size={16} /> Install
        </button>
      )}
    </div>
  );
}
