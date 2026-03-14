import { redirect } from "next/navigation";
import { SettingsWorkspace } from "@/components/SettingsWorkspace";
import { requireActiveOrgId } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await requireActiveOrgId(user);
  const admin = createAdminClient();
  const [{ data: keys, error: keysError }, { data: webhook, error: webhookError }, { data: organization, error: orgError }] =
    await Promise.all([
      admin
        .from("api_keys")
        .select("id, name, created_at, last_used_at, is_active")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false }),
      admin
        .from("webhooks")
        .select("id, url, events, active, created_at")
        .eq("org_id", orgId)
        .eq("active", true)
        .maybeSingle(),
      admin
        .from("organizations")
        .select("name, plan")
        .eq("id", orgId)
        .maybeSingle(),
    ]);

  if (keysError) {
    throw new Error(keysError.message);
  }

  if (webhookError && webhookError.code !== "PGRST116") {
    throw new Error(webhookError.message);
  }

  if (orgError && orgError.code !== "PGRST116") {
    throw new Error(orgError.message);
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
          Settings
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Workspace integrations and delivery controls
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Manage API access and outbound webhook subscriptions for the
          ConversAI workspace.
        </p>
      </section>

      <SettingsWorkspace
        initialKeys={keys ?? []}
        initialWebhook={webhook}
        organizationName={organization?.name ?? "ConversAI Workspace"}
        plan={organization?.plan ?? "pro"}
      />
    </div>
  );
}
