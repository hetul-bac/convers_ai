import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { parseCsv } from "@/lib/csv";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";

function parseTags(raw: string) {
  return raw
    .split(/[\|,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export async function POST(request: Request) {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);

  if (rows.length < 2) {
    return NextResponse.json(
      { error: "CSV must include a header row and at least one contact row." },
      { status: 400 },
    );
  }

  const headers = rows[0].map((value) => value.trim().toLowerCase());
  const nameIndex = headers.indexOf("name");
  const emailIndex = headers.indexOf("email");
  const phoneIndex = headers.indexOf("phone");
  const tagsIndex = headers.indexOf("tags");

  if (emailIndex === -1 && phoneIndex === -1) {
    return NextResponse.json(
      { error: "CSV must include email or phone columns." },
      { status: 400 },
    );
  }

  const contacts = rows
    .slice(1)
    .map((row) => {
      const name = nameIndex >= 0 ? row[nameIndex]?.trim() || null : null;
      const email = emailIndex >= 0 ? row[emailIndex]?.trim() || null : null;
      const phone = phoneIndex >= 0 ? row[phoneIndex]?.trim() || null : null;
      const tags = tagsIndex >= 0 ? parseTags(row[tagsIndex] ?? "") : [];

      if (!email && !phone) {
        return null;
      }

      return {
        id: randomUUID(),
        org_id: authorization.orgId,
        name,
        email,
        phone,
        tags,
      };
    })
    .filter((contact): contact is NonNullable<typeof contact> => Boolean(contact));

  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "No valid contacts found in CSV." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert(contacts)
    .select("id, name, email, phone, tags");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    inserted: data ?? [],
  });
}
