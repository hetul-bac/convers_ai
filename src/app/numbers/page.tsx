import { redirect } from "next/navigation";
import { NumbersWorkspace } from "@/components/NumbersWorkspace";
import { requireActiveOrgId } from "@/lib/org";
import { lookupPhoneNumber } from "@/lib/phoneLookup";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function NumbersPage() {
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
    .select("id, number, country_code, carrier, is_verified, is_active, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
          Provisioning
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Phone Numbers
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Review inventory across markets and simulate new number provisioning by country.
        </p>
      </section>

      <NumbersWorkspace
        initialNumbers={(data ?? []).map((row) => {
          const lookup = lookupPhoneNumber(row.number);

          return {
            ...row,
            country: lookup.country,
            flag: lookup.flag,
          };
        })}
      />
    </div>
  );
}
