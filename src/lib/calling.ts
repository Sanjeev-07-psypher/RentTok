import "server-only";

// ---------------------------------------------------------------------------
// Exotel masked-calling (click-to-connect). Kept dormant until credentials are
// present, so nothing breaks before you onboard Exotel.
//   Required env: EXOTEL_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, EXOTEL_CALLER_ID
//   Optional:     EXOTEL_SUBDOMAIN (default api.exotel.com), EXOTEL_GREETING_URL
//                 (Exotel App/flow that plays "connecting… this call is recorded"),
//                 EXOTEL_CALLBACK_SECRET (validates the status webhook)
// ---------------------------------------------------------------------------
const SID = process.env.EXOTEL_SID ?? "";
const API_KEY = process.env.EXOTEL_API_KEY ?? "";
const API_TOKEN = process.env.EXOTEL_API_TOKEN ?? "";
const SUBDOMAIN = process.env.EXOTEL_SUBDOMAIN ?? "api.exotel.com";
const CALLER_ID = process.env.EXOTEL_CALLER_ID ?? ""; // ExoPhone (virtual number)
const GREETING_URL = process.env.EXOTEL_GREETING_URL ?? "";
export const EXOTEL_CALLBACK_SECRET = process.env.EXOTEL_CALLBACK_SECRET ?? "";

// Feature flag: masked calling only turns on once all creds are configured.
export const isCallingConfigured = Boolean(SID && API_KEY && API_TOKEN && CALLER_ID);

export type PlaceCallResult = { ok: true; callSid: string } | { ok: false; error: string };

// Connect two real numbers through the ExoPhone. Exotel rings `from` (the
// initiator) first, plays the greeting, then bridges to `to`. Both parties only
// ever see CALLER_ID — never each other's number. Record=true captures audio.
export async function placeMaskedCall(opts: {
  from: string;
  to: string;
  statusCallback?: string;
}): Promise<PlaceCallResult> {
  if (!isCallingConfigured) return { ok: false, error: "Calling is not enabled yet." };

  const auth = "Basic " + Buffer.from(`${API_KEY}:${API_TOKEN}`).toString("base64");
  const body = new URLSearchParams({
    From: opts.from,
    To: opts.to,
    CallerId: CALLER_ID,
    CallType: "trans",
    Record: "true",
    TimeLimit: "1800",
    TimeOut: "30",
  });
  if (GREETING_URL) body.set("Url", GREETING_URL);
  if (opts.statusCallback) body.set("StatusCallback", opts.statusCallback);

  try {
    const res = await fetch(`https://${SUBDOMAIN}/v1/Accounts/${SID}/Calls/connect.json`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json().catch(() => ({}))) as {
      Call?: { Sid?: string };
      RestException?: { Message?: string };
    };
    if (!res.ok) return { ok: false, error: data?.RestException?.Message ?? `Exotel error ${res.status}` };
    const sid = data?.Call?.Sid;
    if (!sid) return { ok: false, error: "Exotel did not return a call id." };
    return { ok: true, callSid: String(sid) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Call failed" };
  }
}
