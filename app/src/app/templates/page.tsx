import { redirect } from "next/navigation";
import { TemplatesWorkspace } from "@/components/TemplatesWorkspace";
import { requireActiveOrgId } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await requireActiveOrgId(user);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("templates")
    .select("id, name, body, channel, variables, is_approved, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
          Template Studio
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Message Templates
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Keep reusable, channel-specific templates ready for campaigns and triggered flows.
        </p>
      </section>

      <TemplatesWorkspace initialTemplates={data ?? []} />
    </div>
  );
}
