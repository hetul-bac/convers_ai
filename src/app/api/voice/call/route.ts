import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { withUsageLogging } from "@/lib/logUsage";
import { lookupPhoneNumber } from "@/lib/phoneLookup";
import { authorizeRequest } from "@/lib/requestAuth";

type VoiceCallRequest = {
  to?: string;
  message?: string;
};

export const POST = withUsageLogging(async (request) => {
  const authorization = await authorizeRequest(request);

  if (!authorization) {
    return {
      orgId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const payload = (await request.json()) as VoiceCallRequest;
  const to = payload.to?.trim();
  const message = payload.message?.trim();

  if (!to || !message) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json(
        { error: "to and message are required." },
        { status: 400 },
      ),
    };
  }

  const lookup = lookupPhoneNumber(to);

  if (!lookup.is_valid) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json(
        { error: "Invalid phone number." },
        { status: 400 },
      ),
    };
  }

  const callId = randomUUID();
  const estimatedDurationSeconds = Math.min(
    180,
    Math.max(20, Math.ceil(message.length / 10) * 6),
  );

  console.info("[voice/call] Simulated voice dispatch", {
    org_id: authorization.orgId,
    call_id: callId,
    to: lookup.phone,
    estimated_duration_seconds: estimatedDurationSeconds,
  });

  return {
    orgId: authorization.orgId,
    response: NextResponse.json({
      call_id: callId,
      status: "queued",
      channel: "voice",
      to: lookup.phone,
      estimated_duration_seconds: estimatedDurationSeconds,
      timestamp: new Date().toISOString(),
    }),
  };
});
