import { formatCsv } from "@/lib/csv";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("name, email, phone, tags")
    .eq("org_id", authorization.orgId)
    .order("name", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  const csv = formatCsv([
    ["name", "email", "phone", "tags"],
    ...(data ?? []).map((contact) => [
      contact.name ?? "",
      contact.email ?? "",
      contact.phone ?? "",
      Array.isArray(contact.tags) ? contact.tags.join("|") : "",
    ]),
  ]);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="conversai-contacts.csv"',
    },
  });
}
