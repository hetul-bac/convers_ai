import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { withUsageLogging } from "@/lib/logUsage";
import {
  generateWebhookSecret,
  isWebhookEvent,
  webhookEvents,
} from "@/lib/webhooks";

type WebhookRequest = {
  url?: string;
  events?: string[];
};

export const GET = withUsageLogging(async (request: Request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("webhooks")
    .select("id, url, events, active, created_at")
    .eq("org_id", authorization.orgId)
    .eq("active", true)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? null);
});

export const POST = withUsageLogging(async (request: Request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as WebhookRequest;
  const url = payload.url?.trim();
  const events = payload.events ?? [];

  if (!url) {
    return NextResponse.json({ error: "url is required." }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid webhook URL." }, { status: 400 });
  }

  if (events.length === 0) {
    return NextResponse.json(
      { error: "Select at least one event." },
      { status: 400 },
    );
  }

  if (events.some((event) => !isWebhookEvent(event))) {
    return NextResponse.json(
      {
        error: `Invalid event. Allowed values: ${webhookEvents.join(", ")}.`,
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("webhooks")
    .select("id, secret")
    .eq("org_id", authorization.orgId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError && existingError.code !== "PGRST116") {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing?.id) {
    const { data, error } = await admin
      .from("webhooks")
      .update({
        url,
        events,
        active: true,
      })
      .eq("id", existing.id)
      .select("id, url, events, active, created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  }

  const { data, error } = await admin
    .from("webhooks")
    .insert({
      org_id: authorization.orgId,
      url,
      events,
      secret: generateWebhookSecret(),
      active: true,
    })
    .select("id, url, events, active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
});
