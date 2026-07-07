import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EXOTEL_CALLBACK_SECRET } from "@/lib/calling";
import { logEvent } from "@/lib/events";

// Exotel posts call status here when a call ends (duration + recording URL).
export async function POST(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const token = url.searchParams.get("token");

  // Validate the shared secret if one is configured.
  if (EXOTEL_CALLBACK_SECRET && token !== EXOTEL_CALLBACK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Exotel sends form-encoded params.
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(await request.text());
  } catch {
    params = new URLSearchParams();
  }

  const rawStatus = (params.get("Status") || params.get("CallStatus") || "").toLowerCase();
  const allowed = ["initiated", "ringing", "in-progress", "completed", "failed", "no-answer", "busy", "canceled"];
  const status = allowed.includes(rawStatus) ? rawStatus : "completed";
  const recordingUrl = params.get("RecordingUrl") || null;
  const durationStr = params.get("ConversationDuration") || params.get("DialCallDuration") || params.get("Duration");
  const duration = durationStr ? Number(durationStr) : null;
  const callSid = params.get("CallSid");

  const admin = createAdminClient();
  const patch: Record<string, unknown> = {
    status,
    recording_url: recordingUrl,
    duration_sec: Number.isFinite(duration as number) ? duration : null,
    updated_at: new Date().toISOString(),
  };

  // Prefer our own row id (passed on the callback URL); fall back to the SID.
  if (id) {
    await admin.from("calls").update(patch).eq("id", id);
  } else if (callSid) {
    await admin.from("calls").update(patch).eq("exotel_call_sid", callSid);
  }

  await logEvent({ type: `call_${status}`, entity: "call", meta: { callSid } });
  return NextResponse.json({ ok: true });
}
