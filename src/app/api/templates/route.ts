import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { withUsageLogging } from "@/lib/logUsage";
import { allowedChannels, isMessagingChannel } from "@/lib/messaging";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";

type TemplateRequest = {
  name?: string;
  body?: string;
  channel?: string;
  variables?: string[] | string;
};

function normalizeVariables(variables?: string[] | string) {
  if (Array.isArray(variables)) {
    return variables.map((variable) => variable.trim()).filter(Boolean);
  }

  if (typeof variables === "string") {
    return variables
      .split(",")
      .map((variable) => variable.trim())
      .filter(Boolean);
  }

  return [];
}

export const GET = withUsageLogging(async (request) => {
  const authorization = await authorizeRequest(request);

  if (!authorization) {
    return {
      orgId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("templates")
    .select("id, name, body, channel, variables, is_approved, created_at")
    .eq("org_id", authorization.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  return {
    orgId: authorization.orgId,
    response: NextResponse.json(data ?? []),
  };
});

export const POST = withUsageLogging(async (request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return {
      orgId: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const payload = (await request.json()) as TemplateRequest;
  const name = payload.name?.trim();
  const body = payload.body?.trim();
  const channel = payload.channel?.trim().toLowerCase() ?? "";
  const variables = normalizeVariables(payload.variables);

  if (!name || !body || !channel) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json(
        { error: "name, body, and channel are required." },
        { status: 400 },
      ),
    };
  }

  if (!isMessagingChannel(channel) || !allowedChannels.includes(channel)) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: "Invalid channel." }, { status: 400 }),
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("templates")
    .insert({
      id: randomUUID(),
      org_id: authorization.orgId,
      name,
      body,
      channel,
      variables,
      is_approved: false,
    })
    .select("id, name, body, channel, variables, is_approved, created_at")
    .single();

  if (error) {
    return {
      orgId: authorization.orgId,
      response: NextResponse.json({ error: error.message }, { status: 500 }),
    };
  }

  return {
    orgId: authorization.orgId,
    response: NextResponse.json(data),
  };
});
