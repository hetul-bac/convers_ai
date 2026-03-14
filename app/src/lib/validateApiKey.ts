import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

function hashApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

export async function validateApiKey(apiKey: string | null) {
  if (!apiKey) {
    return null;
  }

  const supabase = createAdminClient();
  const keyHash = hashApiKey(apiKey);
  const { data, error } = await supabase
    .from("api_keys")
    .select("org_id")
    .eq("key_hash", keyHash)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data?.org_id) {
    return null;
  }

  return data.org_id as string;
}

export async function touchApiKey(apiKey: string | null) {
  if (!apiKey) {
    return;
  }

  const supabase = createAdminClient();
  const keyHash = hashApiKey(apiKey);

  await supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash)
    .eq("is_active", true);
}

export function getApiKeyHash(apiKey: string) {
  return hashApiKey(apiKey);
}
