import { NextResponse } from "next/server";
import { withUsageLogging } from "@/lib/logUsage";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";

type CheckVerificationRequest = {
  verification_id?: string;
  code?: string;
};

export const POST = withUsageLogging(async (request) => {
  const authorization = await authorizeRequest(request);

  if (!authorization) {
    return {
      orgId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const payload = (await request.json()) as CheckVerificationRequest;
  const verificationId = payload.verification_id?.trim();
  const code = payload.code?.trim();

  if (!verificationId || !code) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json(
        { error: "verification_id and code are required." },
        { status: 400 },
      ),
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("verifications")
    .select("id, code, status, expires_at")
    .eq("id", verificationId)
    .eq("org_id", authorization.orgId)
    .maybeSingle();

  if (error) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  if (!data) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({
        valid: false,
        reason: "wrong_code",
      }),
    };
  }

  const expiresAt = new Date(data.expires_at);
  const isExpired = data.status === "expired" || expiresAt.getTime() <= Date.now();

  if (isExpired) {
    if (data.status !== "expired") {
      await admin.from("verifications").update({ status: "expired" }).eq("id", data.id);
    }

    return {
      orgId: authorization.orgId,
      response: NextResponse.json({
        valid: false,
        reason: "expired",
      }),
    };
  }

  if (data.status !== "pending" || data.code !== code) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({
        valid: false,
        reason: "wrong_code",
      }),
    };
  }

  const { error: updateError } = await admin
    .from("verifications")
    .update({ status: "verified" })
    .eq("id", data.id);

  if (updateError) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: updateError.message }, { status: 500 }),
    };
  }

  return {
    orgId: authorization.orgId,
    response: NextResponse.json({ valid: true }),
  };
});
