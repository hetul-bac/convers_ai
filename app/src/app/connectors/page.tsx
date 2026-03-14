import { redirect } from "next/navigation";
import { ConnectorsWorkspace } from "@/components/ConnectorsWorkspace";
import { requireActiveOrgId } from "@/lib/org";
import { loadConnectorsForOrg } from "@/lib/connectorsServer";
import { createClient } from "@/lib/supabase/server";

export default async function ConnectorsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await requireActiveOrgId(user);
  const connectors = await loadConnectorsForOrg(orgId);

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
          Connectors
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Unified channel account setup
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Connect SMS, RCS, WhatsApp, Telegram, and Viber profiles so the
          platform knows which provider account should back each channel.
        </p>
      </section>

      <ConnectorsWorkspace initialConnectors={connectors} />
    </div>
  );
}
