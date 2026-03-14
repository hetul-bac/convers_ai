import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/OnboardingForm";
import { getActiveOrgIdForUser } from "@/lib/org";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await getActiveOrgIdForUser(user);

  if (orgId) {
    redirect("/dashboard");
  }

  return <OnboardingForm email={user.email ?? ""} />;
}
