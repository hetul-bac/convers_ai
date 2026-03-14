import { redirect } from "next/navigation";
import { LookupWorkspace } from "@/components/LookupWorkspace";
import { requireActiveOrgId } from "@/lib/org";
import { lookupPhoneNumber } from "@/lib/phoneLookup";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function LookupPage() {
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
    .from("phone_numbers")
    .select("number")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
          Number Lookup
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Phone Number Lookup
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Simulate phone intelligence with country, carrier, validation, and line type
          data before a send.
        </p>
      </section>

      <LookupWorkspace
        exampleLookups={(data ?? []).map((row) => lookupPhoneNumber(row.number))}
      />
    </div>
  );
}
