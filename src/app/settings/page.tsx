import { redirect } from "next/navigation";
import { SettingsWorkspace } from "@/components/SettingsWorkspace";
import { requireActiveOrgId } from "@/lib/org";
import { getPlanMessageLimit } from "@/lib/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type BillingRecord = {
  id: string;
  period_start: string;
  period_end: string;
  total_messages: number;
  total_cost: number;
  plan: string;
  status: string;
  created_at: string;
};

type UsageLogRow = {
  endpoint: string;
  response_time_ms: number | null;
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await requireActiveOrgId(user);
  const admin = createAdminClient();
  const [
    { data: keys, error: keysError },
    { data: webhook, error: webhookError },
    { data: organization, error: orgError },
    { data: billing, error: billingError },
    { data: usageLogs, error: usageError },
  ] =
    await Promise.all([
      admin
        .from("api_keys")
        .select("id, name, created_at, last_used_at, is_active")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
      admin
        .from("webhooks")
        .select("id, url, events, active, created_at")
        .eq("org_id", orgId)
        .eq("active", true)
        .maybeSingle(),
      admin
        .from("organizations")
        .select("name, plan")
        .eq("id", orgId)
        .maybeSingle(),
      admin
        .from("billing")
        .select("id, period_start, period_end, total_messages, total_cost, plan, status, created_at")
        .eq("org_id", orgId)
        .order("period_start", { ascending: false }),
      admin
        .from("usage_logs")
        .select("endpoint, response_time_ms")
        .eq("org_id", orgId),
    ]);

  if (keysError) {
    throw new Error(keysError.message);
  }

  if (webhookError && webhookError.code !== "PGRST116") {
    throw new Error(webhookError.message);
  }

  if (orgError && orgError.code !== "PGRST116") {
    throw new Error(orgError.message);
  }

  if (billingError) {
    throw new Error(billingError.message);
  }

  if (usageError) {
    throw new Error(usageError.message);
  }

  const billingRecords = (billing ?? []) as BillingRecord[];
  const now = new Date();
  const currentMonthSummary = {
    messages_used: billingRecords
      .filter((record) => {
        const periodStart = new Date(record.period_start);

        return (
          periodStart.getUTCFullYear() === now.getUTCFullYear() &&
          periodStart.getUTCMonth() === now.getUTCMonth()
        );
      })
      .reduce((sum, record) => sum + record.total_messages, 0),
    cost_so_far: Number(
      billingRecords
        .filter((record) => {
          const periodStart = new Date(record.period_start);

          return (
            periodStart.getUTCFullYear() === now.getUTCFullYear() &&
            periodStart.getUTCMonth() === now.getUTCMonth()
          );
        })
        .reduce((sum, record) => sum + Number(record.total_cost), 0)
        .toFixed(4),
    ),
    plan: organization?.plan ?? billingRecords[0]?.plan ?? "pro",
    limit: getPlanMessageLimit(organization?.plan ?? billingRecords[0]?.plan ?? "pro"),
  };

  const usageMap = new Map<
    string,
    { endpoint: string; call_count: number; total_response_ms: number }
  >();

  for (const row of (usageLogs ?? []) as UsageLogRow[]) {
    const existing =
      usageMap.get(row.endpoint) ??
      {
        endpoint: row.endpoint,
        call_count: 0,
        total_response_ms: 0,
      };

    existing.call_count += 1;
    existing.total_response_ms += row.response_time_ms ?? 0;
    usageMap.set(row.endpoint, existing);
  }

  const usageRows = Array.from(usageMap.values())
    .map((row) => ({
      endpoint: row.endpoint,
      call_count: row.call_count,
      avg_response_ms:
        row.call_count > 0
          ? Math.round(row.total_response_ms / row.call_count)
          : 0,
    }))
    .sort((left, right) => right.call_count - left.call_count);

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
          Settings
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Workspace integrations and delivery controls
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Manage API access and outbound webhook subscriptions for the
          ConversAI workspace.
        </p>
      </section>

      <SettingsWorkspace
        initialKeys={keys ?? []}
        initialWebhook={webhook}
        organizationName={organization?.name ?? "ConversAI Workspace"}
        plan={organization?.plan ?? "pro"}
        billingRecords={billingRecords}
        currentMonthSummary={currentMonthSummary}
        usageRows={usageRows}
      />
    </div>
  );
}
