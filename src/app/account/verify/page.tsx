import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ConnectNotice } from "@/components/connect-notice";
import { AadhaarVerifyForm } from "@/components/aadhaar-verify-form";

export const metadata = { title: "Verify your identity — RentTok" };

export default async function VerifyPage() {
  if (!isSupabaseConfigured) return <ConnectNotice feature="Identity verification" />;

  const user = await getCurrentUser();
  if (!user) return <SignInPrompt />;

  const status = user.profile?.aadhaar_status ?? "none";
  const last4 = user.profile?.aadhaar_last4 ?? null;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <BadgeCheck size={22} className="text-[var(--primary)]" /> Verify your identity
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        RentTok verifies that every owner and tenant is a real Indian citizen using Aadhaar.
        Verification is manual and one-time.
      </p>

      <AadhaarVerifyForm status={status} last4={last4} />
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <BadgeCheck size={36} className="mx-auto text-[var(--muted)]" />
      <p className="mt-3 font-medium">Sign in to verify your identity</p>
      <Link href="/login" className="mt-2 inline-block text-sm text-[var(--primary)] hover:underline">
        Go to sign in
      </Link>
    </div>
  );
}
