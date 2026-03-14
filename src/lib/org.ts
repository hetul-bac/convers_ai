import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

type SessionUser = Pick<User, "id" | "email" | "app_metadata" | "user_metadata">;

export function readOrgIdFromUser(user?: SessionUser | null) {
  const appOrg = user?.app_metadata?.org_id;
  const userOrg = user?.user_metadata?.org_id;

  if (typeof appOrg === "string" && appOrg.length > 0) {
    return appOrg;
  }

  if (typeof userOrg === "string" && userOrg.length > 0) {
    return userOrg;
  }

  return null;
}

export async function getActiveOrgIdForUser(user?: SessionUser | null) {
  const metadataOrgId = readOrgIdFromUser(user);

  if (metadataOrgId) {
    return metadataOrgId;
  }

  if (!user?.id) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("organization_members")
    .select("org_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || typeof data?.org_id !== "string") {
    return null;
  }

  return data.org_id;
}

export async function requireActiveOrgId(user?: SessionUser | null) {
  const orgId = await getActiveOrgIdForUser(user);

  if (!orgId) {
    redirect("/onboarding");
  }

  return orgId;
}
