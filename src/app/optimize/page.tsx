import { redirect } from "next/navigation";
import { OptimizeWorkspace } from "@/components/OptimizeWorkspace";
import { requireActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function OptimizePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await requireActiveOrgId(user);

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
          Optimize
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Generate channel-ready message variants
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Start from a single message and adapt it for SMS, WhatsApp, RCS,
          Telegram, and Viber in one workflow.
        </p>
      </section>

      <OptimizeWorkspace />
    </div>
  );
}
