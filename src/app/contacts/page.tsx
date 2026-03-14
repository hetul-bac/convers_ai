import { redirect } from "next/navigation";
import { ContactsWorkspace } from "@/components/ContactsWorkspace";
import { requireActiveOrgId } from "@/lib/org";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function ContactsPage() {
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
    .from("contacts")
    .select("id, name, email, phone, tags")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="space-y-6">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
          Contacts
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Manage your messaging audience
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Add contacts manually, import them from CSV, or export your current
          audience for reuse in other systems.
        </p>
      </section>

      <ContactsWorkspace initialContacts={data ?? []} />
    </div>
  );
}
