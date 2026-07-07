"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Mail, X, MailCheck, ArrowLeft, Phone, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, isPhoneAuthEnabled } from "@/lib/supabase/config";
import { Button, Input } from "./ui";

export function AuthDialog({
  open,
  onClose,
  redirectTo,
}: {
  open: boolean;
  onClose: () => void;
  redirectTo?: string;
}) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"email" | "sent" | "phone" | "phone-otp">("email");
  const [loading, setLoading] = useState(false);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const supabase = isSupabaseConfigured ? createClient() : null;
  const nextPath =
    redirectTo ?? (typeof window !== "undefined" ? window.location.pathname : "/");
  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
      : "/auth/callback";

  async function sendMagicLink() {
    if (!supabase) return toast.error("Connect Supabase to enable login (see .env.local).");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Enter a valid email address.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true, emailRedirectTo: callbackUrl },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setStage("sent");
  }

  async function google() {
    if (!supabase) return toast.error("Connect Supabase to enable login (see .env.local).");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) toast.error(error.message);
  }

  // Normalise an Indian number to E.164 (+91XXXXXXXXXX).
  function normalizePhone(raw: string): string | null {
    const digits = raw.replace(/\D/g, "");
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
    if (raw.startsWith("+") && digits.length >= 11) return `+${digits}`;
    return null;
  }

  async function sendSmsOtp() {
    if (!supabase) return toast.error("Connect Supabase to enable login (see .env.local).");
    const e164 = normalizePhone(phone);
    if (!e164) return toast.error("Enter a valid 10-digit mobile number.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setLoading(false);
    if (error) return toast.error(error.message);
    setPhone(e164);
    setStage("phone-otp");
  }

  async function verifySmsOtp() {
    if (!supabase) return;
    if (!/^\d{4,8}$/.test(otp)) return toast.error("Enter the code we texted you.");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ phone, token: otp, type: "sms" });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in!");
    onClose();
    if (typeof window !== "undefined") window.location.reload();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="animate-fade-in relative w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)] sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {stage === "email" ? (
          <>
            <h2 className="text-2xl font-bold tracking-tight">Welcome to Rent-tok</h2>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              Sign in or create an account to book rooms and contact owners.
            </p>

            <div className="mt-6 space-y-3">
              <Button variant="outline" className="h-12 w-full" onClick={google}>
                <GoogleIcon /> Continue with Google
              </Button>

              <div className="flex items-center gap-3 py-1 text-xs font-medium text-[var(--muted)]">
                <span className="h-px flex-1 bg-[var(--border)]" /> OR
                <span className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <label className="block text-sm font-medium" htmlFor="auth-email">
                Email address
              </label>
              <Input
                id="auth-email"
                type="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMagicLink()}
              />
              <Button className="h-12 w-full" onClick={sendMagicLink} disabled={loading}>
                <Mail size={16} /> {loading ? "Sending link…" : "Continue with email"}
              </Button>

              <Button
                variant="outline"
                className="h-12 w-full"
                onClick={() => {
                  if (!isPhoneAuthEnabled) {
                    toast("Phone login is coming soon — use email or Google for now.");
                    return;
                  }
                  setStage("phone");
                }}
              >
                <Phone size={16} /> Continue with phone
                {!isPhoneAuthEnabled && (
                  <span className="ml-1 rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    Soon
                  </span>
                )}
              </Button>
            </div>

            <p className="mt-5 text-center text-xs text-[var(--muted)]">
              By continuing you agree to Rent-tok&apos;s Terms & Privacy Policy.
            </p>
          </>
        ) : stage === "phone" ? (
          <>
            <button
              onClick={() => setStage("email")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <ArrowLeft size={15} /> Back
            </button>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">Sign in with phone</h2>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              We&apos;ll text you a one-time code to verify your number.
            </p>
            <div className="mt-6 space-y-3">
              <label className="block text-sm font-medium" htmlFor="auth-phone">
                Mobile number
              </label>
              <Input
                id="auth-phone"
                type="tel"
                autoFocus
                placeholder="98XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendSmsOtp()}
              />
              <Button className="h-12 w-full" onClick={sendSmsOtp} disabled={loading}>
                <MessageSquare size={16} /> {loading ? "Sending code…" : "Send code"}
              </Button>
            </div>
          </>
        ) : stage === "phone-otp" ? (
          <>
            <button
              onClick={() => setStage("phone")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <ArrowLeft size={15} /> Change number
            </button>
            <h2 className="mt-3 text-2xl font-bold tracking-tight">Enter the code</h2>
            <p className="mt-1.5 text-sm text-[var(--muted)]">
              Sent to <span className="font-medium text-[var(--foreground)]">{phone}</span>.
            </p>
            <div className="mt-6 space-y-3">
              <Input
                autoFocus
                inputMode="numeric"
                maxLength={8}
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && verifySmsOtp()}
              />
              <Button className="h-12 w-full" onClick={verifySmsOtp} disabled={loading}>
                {loading ? "Verifying…" : "Verify & sign in"}
              </Button>
            </div>
          </>
        ) : (
          <div className="py-2 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]">
              <MailCheck size={26} />
            </div>
            <h2 className="mt-4 text-xl font-bold">Check your inbox</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              We sent a secure sign-in link to{" "}
              <span className="font-medium text-[var(--foreground)]">{email}</span>. Open it on this
              device to finish signing in.
            </p>
            <p className="mt-3 text-xs text-[var(--muted)]">
              Didn&apos;t get it? Check spam, or wait a minute and try again.
            </p>
            <button
              onClick={() => setStage("email")}
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline"
            >
              <ArrowLeft size={15} /> Use a different email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
