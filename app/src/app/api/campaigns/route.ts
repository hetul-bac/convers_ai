import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { recordAnalyticsUpdates } from "@/lib/analytics";
import { resolveConnectorForChannel } from "@/lib/connectorsServer";
import { costMap, isMessagingChannel, simulateDeliveryStatus } from "@/lib/messaging";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWebhookEvent } from "@/lib/webhooks";

type CampaignRequest = {
  name?: string;
  message_body?: string;
  channels?: string[];
};

export async function POST(request: Request) {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CampaignRequest;

  if (
    !payload.name?.trim() ||
    !payload.message_body?.trim() ||
    !payload.channels?.length
  ) {
    return NextResponse.json(
      { error: "name, message_body, and channels are required." },
      { status: 400 },
    );
  }

  if (
    payload.channels.some(
      (channel) => !isMessagingChannel(channel),
    )
  ) {
    return NextResponse.json({ error: "Invalid channel selection." }, { status: 400 });
  }

  const selectedChannels = payload.channels.filter(isMessagingChannel);
  const connectorProfiles = await Promise.all(
    selectedChannels.map(async (channel) => {
      const profile = await resolveConnectorForChannel(authorization.orgId, channel);

      return {
        channel,
        provider: profile?.provider ?? null,
        delivery_mode: profile?.transport_mode ?? "simulated",
      };
    }),
  );
  const supabase = createAdminClient();
  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id, phone, email, name")
    .eq("org_id", authorization.orgId);

  if (contactsError) {
    return NextResponse.json({ error: contactsError.message }, { status: 500 });
  }

  if (!contacts?.length) {
    return NextResponse.json(
      { error: "Add at least one contact before sending a campaign." },
      { status: 400 },
    );
  }

  const campaignId = randomUUID();
  const messageRows = contacts.flatMap((contact) =>
    selectedChannels.map((channel) => {
      const deliveryStatus = simulateDeliveryStatus();
      const recipient = contact.name ?? contact.email ?? contact.phone ?? "Unknown";

      return {
        id: randomUUID(),
        org_id: authorization.orgId,
        body: `${payload.message_body}\n\nRecipient: ${recipient}`,
        channel,
        status: deliveryStatus,
        cost: costMap[channel],
        sentiment_label: "neutral",
        sentiment_score: 0,
      };
    }),
  );
  const sentCount = messageRows.length;
  const deliveredCount = messageRows.filter(
    (message) => message.status === "delivered",
  ).length;

  const { error: messagesError } = await supabase.from("messages").insert(messageRows);

  if (messagesError) {
    return NextResponse.json({ error: messagesError.message }, { status: 500 });
  }

  try {
    await recordAnalyticsUpdates(
      authorization.orgId,
      messageRows.map((message) => ({
        channel: message.channel,
        status: message.status,
        cost: Number(message.cost),
      })),
    );
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

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      id: campaignId,
      org_id: authorization.orgId,
      name: payload.name.trim(),
      message_body: payload.message_body.trim(),
      channels: selectedChannels,
      status: "completed",
      sent_count: sentCount,
      delivered_count: deliveredCount,
    })
    .select("id, name, channels, status, sent_count, delivered_count, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void dispatchWebhookEvent(authorization.orgId, "campaign.sent", {
    id: data.id,
    name: data.name,
    channels: data.channels,
    sent_count: data.sent_count,
    delivered_count: data.delivered_count,
  });

  return NextResponse.json({
    ...data,
    connector_profiles: connectorProfiles,
  });
}
