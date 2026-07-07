import Link from "next/link";
import { UserCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ConnectNotice } from "@/components/connect-notice";
import { TenantDetailsForm } from "@/components/tenant-details-form";

export const metadata = { title: "Your details — RentTok" };

export default async function DetailsPage(props: PageProps<"/account/details">) {
  if (!isSupabaseConfigured) return <ConnectNotice feature="Your details" />;

  const sp = await props.searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;

  const user = await getCurrentUser();
  if (!user) return <SignInPrompt />;

  const p = user.profile;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <UserCircle size={22} className="text-[var(--primary)]" /> Your details
      </h1>
      <p className="mt-1 text-sm text-[var(--muted)]">
        We collect these once so owners can reach you and your guardian. You can update them anytime.
      </p>

      <TenantDetailsForm
        next={next}
        initial={{
          full_name: p?.full_name,
          phone: p?.phone,
          age: p?.age,
          permanent_address: p?.permanent_address,
          guardian_name: p?.guardian_name,
          guardian_phone: p?.guardian_phone,
        }}
      />
    </div>
  );
}

function SignInPrompt() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <UserCircle size={36} className="mx-auto text-[var(--muted)]" />
      <p className="mt-3 font-medium">Sign in to add your details</p>
      <Link href="/login" className="mt-2 inline-block text-sm text-[var(--primary)] hover:underline">
        Go to sign in
      </Link>
    </div>
  );
}
