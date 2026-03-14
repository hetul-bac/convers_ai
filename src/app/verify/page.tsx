import { redirect } from "next/navigation";
import { VerifyWorkspace } from "@/components/VerifyWorkspace";
import { requireActiveOrgId } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function VerifyPage() {
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
          2FA Verification
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          2FA / OTP Verification
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Demonstrate SMS, WhatsApp, and voice-based OTP flows directly inside the
          workspace.
        </p>
      </section>

      <VerifyWorkspace />
    </div>
  );
}
