import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withUsageLogging } from "@/lib/logUsage";
import { authorizeRequest } from "@/lib/requestAuth";
import { getApiKeyHash } from "@/lib/validateApiKey";

type CreateKeyRequest = {
  name?: string;
};

export const GET = withUsageLogging(async (request: Request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, created_at, last_used_at, is_active")
    .eq("org_id", authorization.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
});

export const POST = withUsageLogging(async (request: Request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as CreateKeyRequest;
  const name = payload.name?.trim() || `Generated Key ${new Date().toISOString()}`;

  const plaintextKey = `ca_live_${randomBytes(24).toString("hex")}`;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("api_keys")
    .insert({
      org_id: authorization.orgId,
      name,
      key_hash: getApiKeyHash(plaintextKey),
      is_active: true,
    })
    .select("id, name, created_at, last_used_at, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    key: plaintextKey,
    record: data,
  });
});
