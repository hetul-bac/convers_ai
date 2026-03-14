import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getActiveOrgIdForUser } from "@/lib/org";
import { withUsageLogging } from "@/lib/logUsage";
import { setRequestContextOrgId } from "@/lib/requestContext";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildStarterContacts } from "@/lib/starterContacts";

const allowedPlans = ["free", "starter", "pro", "enterprise"] as const;

type OnboardingRequest = {
  organization_name?: string;
  plan?: string;
};

export const POST = withUsageLogging(async (request: Request) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingOrgId = await getActiveOrgIdForUser(user);

  if (existingOrgId) {
    setRequestContextOrgId(existingOrgId);
    return NextResponse.json({ org_id: existingOrgId });
  }

  const payload = (await request.json()) as OnboardingRequest;
  const organizationName = payload.organization_name?.trim();
  const selectedPlan = payload.plan ?? "pro";

  if (!organizationName) {
    return NextResponse.json(
      { error: "organization_name is required." },
      { status: 400 },
    );
  }

  if (!allowedPlans.includes(selectedPlan as (typeof allowedPlans)[number])) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const admin = createAdminClient();
  const organizationId = randomUUID();
  const memberId = randomUUID();
  const fullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name
        : user.email ?? "Workspace Owner";
  const avatarUrl =
    typeof user.user_metadata?.avatar_url === "string"
      ? user.user_metadata.avatar_url
      : null;

  const { error: organizationError } = await admin.from("organizations").insert({
    id: organizationId,
    name: organizationName,
    plan: selectedPlan,
  });

  if (organizationError) {
    return NextResponse.json({ error: organizationError.message }, { status: 500 });
  }

  const { error: memberError } = await admin.from("organization_members").insert({
    id: memberId,
    org_id: organizationId,
    user_id: user.id,
    email: user.email ?? "",
    full_name: fullName,
    avatar_url: avatarUrl,
    role: "owner",
  });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  const { error: contactsError } = await admin
    .from("contacts")
    .insert(buildStarterContacts(organizationId));

  if (contactsError) {
    return NextResponse.json({ error: contactsError.message }, { status: 500 });
  }

  const { error: metadataError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...user.app_metadata,
      org_id: organizationId,
      role: "owner",
    },
    user_metadata: {
      ...user.user_metadata,
      org_id: organizationId,
    },
  });

  if (metadataError) {
    return NextResponse.json({ error: metadataError.message }, { status: 500 });
  }

  setRequestContextOrgId(organizationId);

  return NextResponse.json({
    org_id: organizationId,
    organization_name: organizationName,
  });
});
