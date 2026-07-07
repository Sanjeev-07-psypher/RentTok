"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthDialog } from "@/components/auth-dialog";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const [open, setOpen] = useState(true);

  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <p className="text-[var(--muted)]">Redirecting you to sign in…</p>
      <AuthDialog
        open={open}
        redirectTo={next}
        onClose={() => {
          setOpen(false);
          router.push(next);
        }}
      />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
