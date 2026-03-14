import { NextResponse } from "next/server";
import { withUsageLogging } from "@/lib/logUsage";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";

type UsageLogRow = {
  endpoint: string;
  response_time_ms: number | null;
};

export const GET = withUsageLogging(async (request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return {
      orgId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("usage_logs")
    .select("endpoint, response_time_ms")
    .eq("org_id", authorization.orgId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  const grouped = new Map<string, { endpoint: string; call_count: number; total_response_ms: number }>();

  for (const row of (data ?? []) as UsageLogRow[]) {
    const existing =
      grouped.get(row.endpoint) ??
      {
        endpoint: row.endpoint,
        call_count: 0,
        total_response_ms: 0,
      };

    existing.call_count += 1;
    existing.total_response_ms += row.response_time_ms ?? 0;
    grouped.set(row.endpoint, existing);
  }

  const usage = Array.from(grouped.values())
    .map((row) => ({
      endpoint: row.endpoint,
      call_count: row.call_count,
      avg_response_ms:
        row.call_count > 0
          ? Math.round(row.total_response_ms / row.call_count)
          : 0,
    }))
    .sort((left, right) => right.call_count - left.call_count);

  return {
    orgId: authorization.orgId,
    response: NextResponse.json(usage),
  };
});
