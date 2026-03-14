import { redirect } from "next/navigation";
import { InboxRealtime } from "@/components/InboxRealtime";
import { requireActiveOrgId } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function InboxPage() {
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
    .from("messages")
    .select(
      "id, body, channel, status, sentiment_label, sentiment_score, created_at",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
          Live Inbox
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Recent message activity
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Negative sentiment is surfaced first so operators can respond faster.
          Updates stream in through a Supabase realtime channel.
        </p>
      </section>

      <InboxRealtime initialMessages={data ?? []} orgId={orgId} />
    </div>
  );
}
