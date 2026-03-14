import type { MessagingChannel } from "@/lib/messaging";
import {
  sanitizeConnectorRow,
  type ConnectorRow,
  type ConnectorView,
} from "@/lib/connectors";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loadConnectorsForOrg(orgId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("channel_connectors")
    .select(
      "id, org_id, channel, name, provider, transport_mode, status, config, error_message, last_tested_at, active, created_at, updated_at",
    )
    .eq("org_id", orgId)
    .order("channel", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ConnectorRow[]).map(sanitizeConnectorRow);
}

export async function resolveConnectorForChannel(
  orgId: string,
  channel: MessagingChannel,
): Promise<ConnectorView | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("channel_connectors")
    .select(
      "id, org_id, channel, name, provider, transport_mode, status, config, error_message, last_tested_at, active, created_at, updated_at",
    )
    .eq("org_id", orgId)
    .eq("channel", channel)
    .eq("active", true)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return sanitizeConnectorRow(data as ConnectorRow);
}
