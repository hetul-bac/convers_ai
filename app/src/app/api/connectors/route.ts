import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/requestAuth";
import {
  getConnectorDefinition,
  isConnectorProvider,
  sanitizeConnectorRow,
  validateConnectorCredentials,
  type ConnectorRow,
} from "@/lib/connectors";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMessagingChannel } from "@/lib/messaging";

type ConnectorRequest = {
  name?: string;
  channel?: string;
  provider?: string;
  credentials?: Record<string, unknown>;
};

export async function GET(request: Request) {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("channel_connectors")
    .select(
      "id, org_id, channel, name, provider, transport_mode, status, config, error_message, last_tested_at, active, created_at, updated_at",
    )
    .eq("org_id", authorization.orgId)
    .order("channel", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    ((data ?? []) as ConnectorRow[]).map(sanitizeConnectorRow),
  );
}

export async function POST(request: Request) {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as ConnectorRequest;

  if (!payload.channel || !payload.provider) {
    return NextResponse.json(
      { error: "channel and provider are required." },
      { status: 400 },
    );
  }

  if (!isMessagingChannel(payload.channel)) {
    return NextResponse.json({ error: "Invalid channel." }, { status: 400 });
  }

  if (!isConnectorProvider(payload.provider)) {
    return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
  }

  const definition = getConnectorDefinition(payload.provider);

  if (!definition || !definition.channels.includes(payload.channel)) {
    return NextResponse.json(
      { error: "Selected provider does not support this channel." },
      { status: 400 },
    );
  }

  const validation = validateConnectorCredentials(
    payload.provider,
    payload.credentials ?? {},
  );

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const admin = createAdminClient();
  const timestamp = new Date().toISOString();
  const { data, error } = await admin
    .from("channel_connectors")
    .upsert(
      {
        org_id: authorization.orgId,
        channel: payload.channel,
        name: payload.name?.trim() || definition.label,
        provider: payload.provider,
        transport_mode: validation.transportMode,
        status: validation.status,
        config: validation.normalizedCredentials,
        error_message: null,
        last_tested_at: timestamp,
        active: true,
        updated_at: timestamp,
      },
      {
        onConflict: "org_id,channel",
      },
    )
    .select(
      "id, org_id, channel, name, provider, transport_mode, status, config, error_message, last_tested_at, active, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    connector: sanitizeConnectorRow(data as ConnectorRow),
    message: validation.message,
  });
}
