"use client";

import { useEffect, useRef, useState } from "react";
import { X, Download, Share, Plus, SquarePlus } from "lucide-react";

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

// iPhone/iPod always report iOS. iPadOS 13+ reports a Mac UA, so also treat a
// touch-capable "Mac" as iOS (that's an iPad).
function isIOSDevice(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const deferred = useRef<BIPEvent | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const iOS = isIOSDevice();
    const isMobile = iOS || /Android/i.test(navigator.userAgent);
    if (!isMobile || isStandalone()) return; // hide while running as the installed app

    if (iOS) setIosHint(true);

    // Ms remaining in the snooze window (0 if not snoozed / already elapsed).
    const snoozeLeft = () => {
      const at = Number(localStorage.getItem(SNOOZE_KEY) || 0);
      return Math.max(0, SNOOZE_MS - (Date.now() - at));
    };
    const canShow = () => !isStandalone() && (iOS || deferred.current != null);
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
      setGuideOpen(false);
      if (timer.current) clearTimeout(timer.current);
    };
    window.addEventListener("appinstalled", onInstalled);

    // iOS has no install event → decide purely from the snooze window.
    if (iOS) scheduleShow(snoozeLeft());

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // "X" = snooze for 5 minutes, then let it reappear on its own.
  function snooze() {
    setShow(false);
    setGuideOpen(false);
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
    <>
      <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)] sm:left-auto sm:right-4 sm:max-w-sm">
        <button onClick={snooze} aria-label="Dismiss" className="absolute right-3 top-3 text-[var(--muted)]">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
          <div className="pr-6">
            <p className="text-sm font-semibold">Add RentTok to your home screen</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              {iosHint ? "Opens like an app — no App Store needed." : "Faster access, right from your home screen."}
            </p>
          </div>
        </div>

        {iosHint ? (
          <button
            onClick={() => setGuideOpen(true)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--primary)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"
          >
            <Share size={16} /> Show me how
          </button>
        ) : (
          <button
            onClick={install}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--primary)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"
          >
            <Download size={16} /> Install
          </button>
        )}
      </div>

      {/* iOS step-by-step guide (Add to Home Screen is the only iOS install path) */}
      {guideOpen && iosHint && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={() => setGuideOpen(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
                <p className="font-semibold">Install RentTok in 3 steps</p>
              </div>
              <button onClick={() => setGuideOpen(false)} aria-label="Close" className="text-[var(--muted)]">
                <X size={18} />
              </button>
            </div>

            <p className="mt-2 text-xs text-[var(--muted)]">
              iPhone &amp; iPad add web apps through Safari&apos;s Share menu — it only takes a moment.
            </p>

            <ol className="mt-4 space-y-3">
              <Step n={1} icon={<Share size={18} />}>
                Tap the <span className="font-semibold">Share</span> button in Safari&apos;s toolbar (the square with an up-arrow).
              </Step>
              <Step n={2} icon={<SquarePlus size={18} />}>
                Scroll down and tap <span className="font-semibold">Add to Home Screen</span>.
              </Step>
              <Step n={3} icon={<Plus size={18} />}>
                Tap <span className="font-semibold">Add</span> — RentTok appears on your home screen like an app.
              </Step>
            </ol>

            <button
              onClick={() => setGuideOpen(false)}
              className="mt-5 w-full rounded-full bg-[var(--primary)] py-2.5 text-sm font-semibold text-[var(--primary-foreground)]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Step({ n, icon, children }: { n: number; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--primary)]/12 text-xs font-bold text-[var(--primary)]">
        {n}
      </span>
      <div className="flex items-start gap-2 text-sm leading-snug">
        <span className="mt-0.5 shrink-0 text-[var(--primary)]">{icon}</span>
        <span>{children}</span>
      </div>
    </li>
  );
}
