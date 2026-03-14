import { NextResponse } from "next/server";
import { withUsageLogging } from "@/lib/logUsage";
import { lookupPhoneNumber } from "@/lib/phoneLookup";
import { authorizeRequest } from "@/lib/requestAuth";

export const GET = withUsageLogging(async (request) => {
  const authorization = await authorizeRequest(request);

  if (!authorization) {
    return {
      orgId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const searchParams = new URL(request.url).searchParams;
  const phone = searchParams.get("phone")?.trim();

  if (!phone) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: "phone is required." }, { status: 400 }),
    };
  }

  const result = lookupPhoneNumber(phone);

  return {
    orgId: authorization.orgId,
    response: NextResponse.json(result),
  };
});
