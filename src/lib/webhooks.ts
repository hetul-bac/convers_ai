import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const webhookEvents = [
  "campaign.sent",
  "message.delivered",
  "message.failed",
  "sentiment.updated",
] as const;

export type WebhookEvent = (typeof webhookEvents)[number];

export function isWebhookEvent(value: string): value is WebhookEvent {
  return webhookEvents.includes(value as WebhookEvent);
}

export function generateWebhookSecret() {
  return randomBytes(24).toString("hex");
}

export async function dispatchWebhookEvent(
  orgId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>,
) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhooks")
    .select("url, events, secret, active")
    .eq("org_id", orgId)
    .eq("active", true)
    .maybeSingle();

  if (
    error ||
    !data?.active ||
    typeof data.url !== "string" ||
    !Array.isArray(data.events) ||
    !data.events.includes(event)
  ) {
    return;
  }

  try {
    await fetch(data.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-conversai-secret": data.secret ?? "",
      },
      body: JSON.stringify({
        event,
        occurred_at: new Date().toISOString(),
        payload,
      }),
    });
  } catch {}
}
