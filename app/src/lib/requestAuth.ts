import type { User } from "@supabase/supabase-js";
import { getActiveOrgIdForUser } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";
import { touchApiKey, validateApiKey } from "@/lib/validateApiKey";

type AuthMode = "api_key" | "session";

type AuthorizationResult = {
  mode: AuthMode;
  orgId: string;
  user: User | null;
};

export async function authorizeRequest(
  request: Request,
  options?: { allowApiKey?: boolean; sessionOnly?: boolean },
): Promise<AuthorizationResult | null> {
  const allowApiKey = options?.allowApiKey ?? true;
  const sessionOnly = options?.sessionOnly ?? false;
  const providedApiKey = request.headers.get("x-api-key");

  if (!sessionOnly && allowApiKey && providedApiKey) {
    const orgId = await validateApiKey(providedApiKey);

    if (orgId) {
      await touchApiKey(providedApiKey);
      return {
        mode: "api_key",
        orgId,
        user: null,
      };
    }

    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const orgId = await getActiveOrgIdForUser(user);

  if (!orgId) {
    return null;
  }

  return {
    mode: "session",
    orgId,
    user,
  };
}
