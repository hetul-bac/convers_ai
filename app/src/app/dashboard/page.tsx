import { redirect } from "next/navigation";
import { CircleDollarSign, MessageSquareText, Send, Target } from "lucide-react";
import { DashboardCharts } from "@/components/DashboardCharts";
import { requireActiveOrgId } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type AnalyticsRow = {
  date: string;
  channel: "sms" | "whatsapp" | "rcs" | "telegram" | "viber";
  sent: number;
  delivered: number;
  failed: number;
  cost: number;
};

type MessageRow = {
  created_at: string;
  channel: AnalyticsRow["channel"];
  status: string;
  cost: number;
};

function createDeliveryPoint(date: string) {
  return {
    date,
    sms: 0,
    whatsapp: 0,
    rcs: 0,
    telegram: 0,
    viber: 0,
  };
}

export default async function DashboardPage() {
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
    { data: analytics },
    { data: recentMessages, count: messageCount },
    { count: deliveredCount },
    { count: campaignsCount },
  ] =
    await Promise.all([
      admin
        .from("analytics")
        .select("date, channel, sent, delivered, failed, cost")
        .eq("org_id", orgId)
        .order("date", { ascending: true }),
      admin
        .from("messages")
        .select("created_at, channel, status, cost", { count: "exact" })
        .eq("org_id", orgId)
        .order("created_at", { ascending: true }),
      admin
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId)
        .in("status", ["delivered", "read"]),
      admin
        .from("campaigns")
        .select("*", { count: "exact", head: true })
        .eq("org_id", orgId),
    ]);

  const analyticsRows = (analytics ?? []) as AnalyticsRow[];
  const recentMessageRows = (recentMessages ?? []) as MessageRow[];
  const analyticsTotalMessages = analyticsRows.reduce(
    (sum, row) => sum + row.sent,
    0,
  );
  const totalMessageCount = messageCount ?? recentMessageRows.length;
  const usingAnalytics =
    analyticsRows.length > 0 && analyticsTotalMessages === totalMessageCount;

  const latestDate = usingAnalytics
    ? analyticsRows.at(-1)?.date
    : recentMessageRows.at(-1)?.created_at.slice(0, 10);
  const costToday = usingAnalytics
    ? analyticsRows
        .filter((row) => row.date === latestDate)
        .reduce((sum, row) => sum + Number(row.cost), 0)
    : recentMessageRows
        .filter((row) => row.created_at.slice(0, 10) === latestDate)
        .reduce((sum, row) => sum + Number(row.cost), 0);
  const totalMessages = usingAnalytics
    ? analyticsTotalMessages
    : recentMessageRows.length;
  const totalDelivered = usingAnalytics
    ? analyticsRows.reduce((sum, row) => sum + row.delivered, 0)
    : recentMessageRows.filter((row) => ["delivered", "read"].includes(row.status)).length;

  const deliveryMap = new Map<
    string,
    { date: string; sms: number; whatsapp: number; rcs: number; telegram: number; viber: number }
  >();

  const channelTotals = new Map<string, number>();

  if (usingAnalytics) {
    for (const row of analyticsRows) {
      const deliveryRate = row.sent > 0 ? (row.delivered / row.sent) * 100 : 0;
      const dateKey = row.date;
      const existing = deliveryMap.get(dateKey) ?? createDeliveryPoint(dateKey);

      existing[row.channel] = Number(deliveryRate.toFixed(2));
      deliveryMap.set(dateKey, existing);
      channelTotals.set(
        row.channel,
        (channelTotals.get(row.channel) ?? 0) + row.sent,
      );
    }
  } else {
    const rawDeliveryCounts = new Map<
      string,
      Record<AnalyticsRow["channel"], { sent: number; delivered: number }>
    >();

    for (const row of recentMessageRows) {
      const dateKey = row.created_at.slice(0, 10);
      const existing = rawDeliveryCounts.get(dateKey) ?? {
        sms: { sent: 0, delivered: 0 },
        whatsapp: { sent: 0, delivered: 0 },
        rcs: { sent: 0, delivered: 0 },
        telegram: { sent: 0, delivered: 0 },
        viber: { sent: 0, delivered: 0 },
      };

      existing[row.channel].sent += 1;

      if (row.status === "delivered" || row.status === "read") {
        existing[row.channel].delivered += 1;
      }

      rawDeliveryCounts.set(dateKey, existing);
      channelTotals.set(
        row.channel,
        (channelTotals.get(row.channel) ?? 0) + 1,
      );
    }

    for (const [dateKey, channels] of rawDeliveryCounts.entries()) {
      const point = createDeliveryPoint(dateKey);

      for (const [channel, counts] of Object.entries(channels) as Array<
        [AnalyticsRow["channel"], { sent: number; delivered: number }]
      >) {
        point[channel] =
          counts.sent > 0
            ? Number(((counts.delivered / counts.sent) * 100).toFixed(2))
            : 0;
      }

      deliveryMap.set(dateKey, point);
    }
  }

  const deliveryData = Array.from(deliveryMap.values());
  const channelData = Array.from(channelTotals.entries()).map(
    ([channel, sent]) => ({
      channel,
      sent,
    }),
  );

  const stats = [
    {
      label: "Total Messages",
      value: totalMessages || messageCount || 0,
      accent: "bg-[#ebf5ff] text-[#3182ce]",
      icon: MessageSquareText,
    },
    {
      label: "Delivered",
      value: totalDelivered || deliveredCount || 0,
      accent: "bg-emerald-50 text-emerald-600",
      icon: Send,
    },
    {
      label: "Campaigns",
      value: campaignsCount ?? 0,
      accent: "bg-amber-50 text-amber-600",
      icon: Target,
    },
    {
      label: "Cost Today",
      value: `$${costToday.toFixed(2)}`,
      accent: "bg-sky-50 text-sky-700",
      icon: CircleDollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
              Operations Overview
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 sm:text-4xl">
              ConversAI delivery command center
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Monitor message volume, delivery efficiency, and spend across
              your active messaging channels.
            </p>
          </div>
          <div className="surface-muted grid gap-3 px-5 py-4 text-sm text-slate-600 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Date Window
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                Last {deliveryData.length || 30} days
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Active Channels
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {channelData.length || 0}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Latest Snapshot
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {latestDate ?? "No data yet"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {stats.map(({ label, value, accent, icon: Icon }) => (
          <article key={label} className="surface-panel p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{label}</p>
              <div className={`rounded-2xl p-3 ${accent}`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-8 text-3xl font-semibold text-slate-950">{value}</p>
          </article>
        ))}
      </section>

      <DashboardCharts
        channelData={channelData}
        deliveryData={deliveryData}
      />
    </div>
  );
}
