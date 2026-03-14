import { createAdminClient } from "@/lib/supabase/admin";
import type { MessagingChannel } from "@/lib/messaging";

type AnalyticsUpdate = {
  channel: MessagingChannel;
  status: string;
  cost: number;
  date?: string;
};

type AnalyticsSnapshot = {
  sent: number;
  delivered: number;
  failed: number;
  cost: number;
};

function normalizeDate(date?: string) {
  if (date) {
    return date;
  }

  return new Date().toISOString().slice(0, 10);
}

function createEmptySnapshot(): AnalyticsSnapshot {
  return {
    sent: 0,
    delivered: 0,
    failed: 0,
    cost: 0,
  };
}

function applyUpdate(snapshot: AnalyticsSnapshot, update: AnalyticsUpdate) {
  snapshot.sent += 1;
  snapshot.cost += update.cost;

  if (update.status === "delivered" || update.status === "read") {
    snapshot.delivered += 1;
  } else if (update.status === "failed") {
    snapshot.failed += 1;
  }
}

export async function recordAnalyticsUpdates(
  orgId: string,
  updates: AnalyticsUpdate[],
) {
  if (updates.length === 0) {
    return;
  }

  const grouped = new Map<string, AnalyticsSnapshot>();

  for (const update of updates) {
    const date = normalizeDate(update.date);
    const key = `${date}:${update.channel}`;
    const snapshot = grouped.get(key) ?? createEmptySnapshot();
    applyUpdate(snapshot, update);
    grouped.set(key, snapshot);
  }

  const supabase = createAdminClient();

  for (const [key, snapshot] of grouped.entries()) {
    const [date, channel] = key.split(":") as [string, MessagingChannel];
    const { data: existing, error: existingError } = await supabase
      .from("analytics")
      .select("id, sent, delivered, failed, cost")
      .eq("org_id", orgId)
      .eq("date", date)
      .eq("channel", channel)
      .maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      throw new Error(existingError.message);
    }

    const nextSent = (existing?.sent ?? 0) + snapshot.sent;
    const nextDelivered = (existing?.delivered ?? 0) + snapshot.delivered;
    const nextFailed = (existing?.failed ?? 0) + snapshot.failed;
    const nextCost = Number(((existing?.cost ?? 0) + snapshot.cost).toFixed(4));
    const engagementRate = nextSent > 0 ? Number((nextDelivered / nextSent).toFixed(4)) : 0;

    if (existing?.id) {
      const { error } = await supabase
        .from("analytics")
        .update({
          sent: nextSent,
          delivered: nextDelivered,
          failed: nextFailed,
          cost: nextCost,
          engagement_rate: engagementRate,
        })
        .eq("id", existing.id);

      if (error) {
        throw new Error(error.message);
      }

      continue;
    }

    const { error } = await supabase.from("analytics").insert({
      org_id: orgId,
      date,
      channel,
      sent: snapshot.sent,
      delivered: snapshot.delivered,
      failed: snapshot.failed,
      cost: Number(snapshot.cost.toFixed(4)),
      engagement_rate:
        snapshot.sent > 0
          ? Number((snapshot.delivered / snapshot.sent).toFixed(4))
          : 0,
    });

    if (error) {
      throw new Error(error.message);
    }
  }
}
