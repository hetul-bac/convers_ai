import { NextResponse } from "next/server";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildStarterContacts } from "@/lib/starterContacts";

export async function POST(request: Request) {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { count, error: countError } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true })
    .eq("org_id", authorization.orgId);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }

  if ((count ?? 0) > 0) {
    return NextResponse.json({
      inserted: 0,
      total_contacts: count ?? 0,
    });
  }

  const rows = buildStarterContacts(authorization.orgId);

  const { error } = await supabase.from("contacts").insert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    inserted: rows.length,
    total_contacts: rows.length,
  });
}
