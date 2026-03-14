import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { withUsageLogging } from "@/lib/logUsage";
import { lookupPhoneNumber } from "@/lib/phoneLookup";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";

type SendVerificationRequest = {
  to?: string;
  channel?: string;
};

const verificationChannels = ["sms", "whatsapp", "voice"] as const;

function isVerificationChannel(value: string): value is (typeof verificationChannels)[number] {
  return verificationChannels.includes(value as (typeof verificationChannels)[number]);
}

function generateOtpCode() {
  return String(Math.floor(Math.random() * 1000000)).padStart(6, "0");
}

export const POST = withUsageLogging(async (request) => {
  const authorization = await authorizeRequest(request);

  if (!authorization) {
    return {
      orgId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const payload = (await request.json()) as SendVerificationRequest;
  const to = payload.to?.trim();
  const channel = payload.channel?.trim().toLowerCase() ?? "";

  if (!to || !channel) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json(
        { error: "to and channel are required." },
        { status: 400 },
      ),
    };
  }

  if (!isVerificationChannel(channel)) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: "Invalid channel." }, { status: 400 }),
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

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("verifications")
    .insert({
      id: randomUUID(),
      org_id: authorization.orgId,
      to_number: lookup.phone,
      code,
      channel,
      status: "pending",
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (error) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  console.info("[verify/send] Simulated OTP dispatch", {
    org_id: authorization.orgId,
    verification_id: data.id,
    to: lookup.phone,
    channel,
    code,
    expires_at: expiresAt,
  });

  return {
    orgId: authorization.orgId,
    response: NextResponse.json({
      verification_id: data.id,
      expires_in: 600,
    }),
  };
});
