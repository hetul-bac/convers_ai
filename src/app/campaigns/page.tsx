import { redirect } from "next/navigation";
import { CampaignsWorkspace } from "@/components/CampaignsWorkspace";
import { requireActiveOrgId } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await requireActiveOrgId(user);
  const admin = createAdminClient();
  const [{ data, error }, { count: contactCount, error: contactError }] = await Promise.all([
    admin
      .from("campaigns")
      .select("id, name, channels, status, sent_count, delivered_count, created_at")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    admin
      .from("contacts")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  if (contactError) {
    throw new Error(contactError.message);
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
          Campaigns
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Launch and track outbound campaigns
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Review delivery progress across channels and create a new campaign
          from the workspace without leaving the dashboard.
        </p>
      </section>

      <CampaignsWorkspace
        contactCount={contactCount ?? 0}
        initialCampaigns={data ?? []}
      />
    </div>
  );
}
