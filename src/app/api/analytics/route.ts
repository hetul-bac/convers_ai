import { NextResponse } from "next/server";
import { withUsageLogging } from "@/lib/logUsage";
import { isMessagingChannel } from "@/lib/messaging";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";

type AnalyticsRow = {
  date: string;
  channel: string;
  sent: number;
  delivered: number;
  failed: number;
  cost: number;
  engagement_rate: number;
};

function isValidDate(value: string | null) {
  if (!value) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function defaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export const GET = withUsageLogging(async (request) => {
  const authorization = await authorizeRequest(request);

  if (!authorization) {
    return {
      orgId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const searchParams = new URL(request.url).searchParams;
  const defaults = defaultDateRange();
  const from = searchParams.get("from") ?? defaults.from;
  const to = searchParams.get("to") ?? defaults.to;
  const channel = searchParams.get("channel")?.trim().toLowerCase() ?? null;

  if (!isValidDate(from) || !isValidDate(to)) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json(
        { error: "from and to must be valid YYYY-MM-DD values." },
        { status: 400 },
      ),
    };
  }

  if (channel && !isMessagingChannel(channel)) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json(
        { error: "Invalid channel filter." },
        { status: 400 },
      ),
    };
  }

  const admin = createAdminClient();
  let query = admin
    .from("analytics")
    .select("date, channel, sent, delivered, failed, cost, engagement_rate")
    .eq("org_id", authorization.orgId)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: true });

  if (channel) {
    query = query.eq("channel", channel);
  }

  const { data, error } = await query;

  if (error) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  const rows = (data ?? []) as AnalyticsRow[];
  const summary = {
    total_sent: rows.reduce((sum, row) => sum + row.sent, 0),
    total_delivered: rows.reduce((sum, row) => sum + row.delivered, 0),
    total_cost: Number(
      rows.reduce((sum, row) => sum + Number(row.cost), 0).toFixed(4),
    ),
    avg_engagement:
      rows.length > 0
        ? Number(
            (
              rows.reduce((sum, row) => sum + Number(row.engagement_rate), 0) /
              rows.length
            ).toFixed(4),
          )
        : 0,
  };

  return {
    orgId: authorization.orgId,
    response: NextResponse.json({
      rows,
      summary,
    }),
  };
});
