"use client";

import { useState, useTransition } from "react";
import { Building2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

const plans = [
  { value: "starter", label: "Starter" },
  { value: "pro", label: "Pro" },
  { value: "enterprise", label: "Enterprise" },
] as const;

export function OnboardingForm({ email }: { email: string }) {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [plan, setPlan] = useState<(typeof plans)[number]["value"]>("pro");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    startTransition(async () => {
      setError(null);

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organization_name: organizationName,
          plan,
        }),
      });

      const payload = (await response.json()) as
        | { org_id: string }
        | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Workspace setup failed.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f172a] px-6 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#3182ce33_0%,transparent_35%),radial-gradient(circle_at_bottom_left,#2563eb2e_0%,transparent_30%)]" />

      <div className="relative w-full max-w-3xl overflow-hidden rounded-[36px] border border-white/10 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.55)]">
        <div className="grid gap-8 px-8 py-10 sm:px-12 sm:py-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
              <Sparkles className="h-3.5 w-3.5" />
              Workspace Setup
            </div>
            <h1 className="mt-6 text-4xl font-semibold text-slate-950">
              Create your organization
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Finish setup for <span className="font-semibold text-slate-900">{email}</span>.
              Your organization controls data isolation, API keys, campaigns, and webhook access.
            </p>
          </div>

          <div className="grid gap-6">
            <label className="text-sm font-medium text-slate-800">
              Organization name
              <div className="mt-2 flex items-center gap-3 rounded-3xl border border-slate-200 bg-[#f8fbff] px-4 py-3">
                <Building2 className="h-4 w-4 text-[#3182ce]" />
                <input
                  className="w-full bg-transparent text-sm text-slate-900 outline-none"
                  onChange={(event) => setOrganizationName(event.target.value)}
                  placeholder="Acme Support Team"
                  value={organizationName}
                />
              </div>
            </label>

            <div>
              <p className="text-sm font-medium text-slate-800">Plan</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {plans.map((option) => (
                  <button
                    key={option.value}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      plan === option.value
                        ? "bg-[#3182ce] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    onClick={() => setPlan(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}

          <div className="flex justify-end">
            <button
              className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={handleSubmit}
              type="button"
            >
              {isPending ? "Creating..." : "Create Workspace"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
