export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * True only when real Supabase credentials are present. When false, the app
 * falls back to sample data so the UI is fully previewable before you connect
 * a backend.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Phone-number OTP login. Requires a paid SMS provider (Twilio/MSG91) configured
 * in the Supabase dashboard, so it stays OFF until one is purchased. Set
 * NEXT_PUBLIC_PHONE_AUTH_ENABLED=true once the provider is live.
 */
export const isPhoneAuthEnabled = process.env.NEXT_PUBLIC_PHONE_AUTH_ENABLED === "true";

/**
 * When true, owners must be Aadhaar-verified to list and tenants to book.
 * Off by default so the flow can be tested before anyone is verified.
 * Set NEXT_PUBLIC_REQUIRE_AADHAAR=true to enforce.
 */
export const requireAadhaar = process.env.NEXT_PUBLIC_REQUIRE_AADHAAR === "true";
