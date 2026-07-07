import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on everything except static assets and image optimization.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
