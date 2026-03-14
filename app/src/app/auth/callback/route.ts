import { NextResponse } from "next/server";
import { getActiveOrgIdForUser } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const orgId = await getActiveOrgIdForUser(user);

    return NextResponse.redirect(`${origin}${orgId ? "/dashboard" : "/onboarding"}`);
  }

  return NextResponse.redirect(`${origin}/login`);
}
