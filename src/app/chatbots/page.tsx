import { redirect } from "next/navigation";
import { ChatbotsWorkspace } from "@/components/ChatbotsWorkspace";
import { loadChatbotsForOrg } from "@/lib/chatbotStore";
import { requireActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function ChatbotsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await requireActiveOrgId(user);
  const bots = await loadChatbotsForOrg(orgId);

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
          Chatbots
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Visual chatbot builder and NLP testing
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Design intent-driven conversation flows, test recognition quality, and
          publish reusable bot logic for your messaging workspace.
        </p>
      </section>

      <ChatbotsWorkspace initialBots={bots} />
    </div>
  );
}
