import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { recordAnalyticsUpdates } from "@/lib/analytics";
import { resolveConnectorForChannel } from "@/lib/connectorsServer";
import { costMap, isMessagingChannel, simulateDeliveryStatus } from "@/lib/messaging";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeRequest } from "@/lib/requestAuth";
import { dispatchWebhookEvent } from "@/lib/webhooks";

type MessageRequest = {
  to?: string;
  body?: string;
  channel?: string;
};

export async function POST(request: Request) {
  const authorization = await authorizeRequest(request);

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as MessageRequest;

  if (!payload.to || !payload.body || !payload.channel) {
    return NextResponse.json(
      { error: "to, body, and channel are required." },
      { status: 400 },
    );
  }

  if (!isMessagingChannel(payload.channel)) {
    return NextResponse.json({ error: "Invalid channel." }, { status: 400 });
  }

  const status = simulateDeliveryStatus();
  const channel = payload.channel;
  const cost = costMap[channel];
  const connectorProfile = await resolveConnectorForChannel(
    authorization.orgId,
    channel,
  );
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      id: randomUUID(),
      org_id: authorization.orgId,
      body: `${payload.body}\n\nRecipient: ${payload.to}`,
      channel,
      status,
      cost,
      sentiment_label: "neutral",
      sentiment_score: 0,
    })
    .select("id, status, cost, channel, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await recordAnalyticsUpdates(authorization.orgId, [
      {
        channel,
        status: data.status,
        cost: Number(data.cost),
        date: String(data.created_at).slice(0, 10),
      },
    ]);
  } catch (analyticsError) {
    return NextResponse.json(
      {
        error:
          analyticsError instanceof Error
            ? analyticsError.message
            : "Failed to update analytics.",
      },
      { status: 500 },
    );
  }

  void dispatchWebhookEvent(
    authorization.orgId,
    status === "delivered" ? "message.delivered" : "message.failed",
    {
      id: data.id,
      channel: data.channel,
      status: data.status,
      cost: data.cost,
      timestamp: data.created_at,
    },
  );

  return NextResponse.json({
    id: data.id,
    status: data.status,
    cost: data.cost,
    channel: data.channel,
    timestamp: data.created_at,
    connector_provider: connectorProfile?.provider ?? null,
    delivery_mode: connectorProfile?.transport_mode ?? "simulated",
  });
}
