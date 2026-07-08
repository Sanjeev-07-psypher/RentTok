"use client";

import { useEffect, useRef, useState } from "react";
import { X, Download, Share } from "lucide-react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

// When dismissed, snooze the banner for this long, then let it reappear.
const SNOOZE_MS = 5 * 60 * 1000; // 5 minutes
const SNOOZE_KEY = "rt_install_snoozed_at";

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const deferred = useRef<BIPEvent | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile || isStandalone()) return; // hide while running as the installed app

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isIOS) setIosHint(true);

    // Ms remaining in the snooze window (0 if not snoozed / already elapsed).
    const snoozeLeft = () => {
      const at = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      return Math.max(0, SNOOZE_MS - (Date.now() - at));
    };
    const canShow = () => !isStandalone() && (isIOS || deferred.current != null);
    const scheduleShow = (delay: number) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (canShow()) setShow(true);
      }, delay);
    };

    // Android/Chrome: capture the install event, then show once the snooze passes.
    const onBIP = (e: Event) => {
      e.preventDefault();
      deferred.current = e as BIPEvent;
      scheduleShow(snoozeLeft());
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // If it gets installed, hide (do NOT snooze) so it can return after an uninstall.
    const onInstalled = () => {
      setShow(false);
      if (timer.current) clearTimeout(timer.current);
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS has no install event → decide purely from the snooze window.
    if (isIOS) scheduleShow(snoozeLeft());

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // "X" = snooze for 5 minutes, then let it reappear on its own.
  function snooze() {
    setShow(false);
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!isStandalone() && (iosHint || deferred.current != null)) setShow(true);
    }, SNOOZE_MS);
  }

  async function install() {
    if (!deferred.current) return;
    await deferred.current.prompt();
    await deferred.current.userChoice;
    deferred.current = null;
    setShow(false); // no snooze — 'appinstalled'/standalone handles the installed case
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)] sm:hidden">
      <button
        onClick={snooze}
        aria-label="Dismiss"
        className="absolute right-3 top-3 text-[var(--muted)]"
      >
        <X size={18} />
      </button>
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
        <div className="pr-6">
          <p className="text-sm font-semibold">Install the RentTok app</p>
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
