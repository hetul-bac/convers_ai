import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { withUsageLogging } from "@/lib/logUsage";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";

type ContactRequest = {
  name?: string;
  email?: string;
  phone?: string;
  tags?: string[] | string;
};

function normalizeTags(tags?: string[] | string) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter(Boolean);
  }

  if (typeof tags === "string") {
    return tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

export const GET = withUsageLogging(async (request: Request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("id, name, email, phone, tags")
    .eq("org_id", authorization.orgId)
    .order("name", { ascending: true });

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

  const payload = (await request.json()) as ContactRequest;
  const email = payload.email?.trim() ?? null;
  const phone = payload.phone?.trim() ?? null;
  const name = payload.name?.trim() ?? null;
  const tags = normalizeTags(payload.tags);

  if (!email && !phone) {
    return NextResponse.json(
      { error: "Provide at least an email or phone number." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({
      id: randomUUID(),
      org_id: authorization.orgId,
      name,
      email,
      phone,
      tags,
    })
    .select("id, name, email, phone, tags")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
});
