import { NextResponse } from "next/server";
import { withUsageLogging } from "@/lib/logUsage";

export const GET = withUsageLogging(async () => ({
  orgId: null,
  response: NextResponse.json({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  }),
}));
