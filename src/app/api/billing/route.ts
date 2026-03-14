import { NextResponse } from "next/server";
import { withUsageLogging } from "@/lib/logUsage";
import { getPlanMessageLimit } from "@/lib/plans";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";

type BillingRow = {
  id: string;
  period_start: string;
  period_end: string;
  total_messages: number;
  total_cost: number;
  plan: string;
  status: string;
  created_at: string;
};

export const GET = withUsageLogging(async (request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return {
      orgId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const [{ data: records, error: billingError }, { data: organization, error: orgError }] =
    await Promise.all([
      admin
        .from("billing")
        .select("id, period_start, period_end, total_messages, total_cost, plan, status, created_at")
        .eq("org_id", authorization.orgId)
        .order("period_start", { ascending: false }),
      admin
        .from("organizations")
        .select("plan")
        .eq("id", authorization.orgId)
        .maybeSingle(),
    ]);

  if (billingError) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: billingError.message }, { status: 500 }),
    };
  }

  if (orgError && orgError.code !== "PGRST116") {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: orgError.message }, { status: 500 }),
    };
  }

  const now = new Date();
  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const billingRows = (records ?? []) as BillingRow[];
  const currentMonthRows = billingRows.filter((record) => {
    const date = new Date(record.period_start);

    return (
      date.getUTCFullYear() === currentYear &&
      date.getUTCMonth() === currentMonth
    );
  });
  const plan = organization?.plan ?? billingRows[0]?.plan ?? "free";
  const summary = {
    messages_used: currentMonthRows.reduce(
      (sum, row) => sum + row.total_messages,
      0,
    ),
    cost_so_far: Number(
      currentMonthRows.reduce((sum, row) => sum + Number(row.total_cost), 0).toFixed(4),
    ),
    plan,
    limit: getPlanMessageLimit(plan),
  };

  return {
    orgId: authorization.orgId,
    response: NextResponse.json({
      records: billingRows,
      current_month_summary: summary,
    }),
  };
});
