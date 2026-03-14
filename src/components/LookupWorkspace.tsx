"use client";

import { useState, useTransition } from "react";
import {
  BadgeCheck,
  Globe2,
  Search,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { lookupPhoneNumber, type PhoneLookupResult } from "@/lib/phoneLookup";

type LookupWorkspaceProps = {
  exampleLookups: PhoneLookupResult[];
};

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "neutral" | "success" | "danger";
}) {
  const classes =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "danger"
        ? "bg-rose-50 text-rose-700"
        : "bg-slate-100 text-slate-700";

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${classes}`}>
      {children}
    </span>
  );
}

export function LookupWorkspace({ exampleLookups }: LookupWorkspaceProps) {
  const [phone, setPhone] = useState("+919876543210");
  const [result, setResult] = useState<PhoneLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const livePreview = phone.trim() ? lookupPhoneNumber(phone) : null;

  const handleLookup = () => {
    startTransition(async () => {
      setError(null);

      const searchParams = new URLSearchParams({
        phone,
      });
      const response = await fetch(`/api/lookup?${searchParams.toString()}`);
      const payload = (await response.json()) as PhoneLookupResult | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Lookup failed.");
        return;
      }

      setResult(payload);
    });
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-6">
          <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
            Lookup Console
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">
            Validate a number before you send
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Use the built-in country map to simulate carrier and line-type
            resolution without calling any external phone intelligence service.
          </p>

          <div className="mt-8 flex flex-col gap-4 lg:flex-row">
            <div className="flex min-w-0 flex-1 items-center gap-4 rounded-[32px] border border-slate-200 bg-[#f8fbff] px-5 py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm">
                {livePreview?.flag ?? "🌐"}
              </div>
              <input
                className="w-full bg-transparent text-xl text-slate-950 outline-none"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+919876543210"
                value={phone}
              />
            </div>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3182ce] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={handleLookup}
              type="button"
            >
              <Search className="h-4 w-4" />
              {isPending ? "Looking up..." : "Lookup"}
            </button>
          </div>

          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </div>

        <div className="px-6 py-6">
          {result ? (
            <div className="grid gap-5 rounded-[32px] border border-slate-100 bg-slate-950 px-6 py-6 text-white lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{result.flag}</div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                      Resolved country
                    </p>
                    <p className="mt-2 text-2xl font-semibold">{result.country}</p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Badge tone={result.is_valid ? "success" : "danger"}>
                    {result.is_valid ? "Valid" : "Invalid"}
                  </Badge>
                  <Badge tone="neutral">{result.line_type}</Badge>
                  <Badge tone="neutral">{result.country_code}</Badge>
                </div>
                <p className="mt-6 text-sm leading-7 text-slate-300">
                  {result.phone} routes through {result.carrier}. This simulated lookup is
                  ideal for demos, pre-send validation, and blueprint alignment with
                  carrier intelligence workflows.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Carrier
                  </p>
                  <p className="mt-2 text-lg font-semibold">{result.carrier}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Line type
                  </p>
                  <p className="mt-2 text-lg font-semibold">{result.line_type}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    Validation
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {result.is_valid ? "Ready to message" : "Needs correction"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="surface-muted flex items-center gap-4 px-5 py-5 text-slate-600">
              <Globe2 className="h-5 w-5 text-[#3182ce]" />
              Run a lookup to reveal the country, carrier, validity, and line type.
            </div>
          )}
        </div>
      </section>

      <section className="surface-panel p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
              Seeded Examples
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">
              Five lookups already in the demo workspace
            </h2>
          </div>
          <p className="text-sm leading-7 text-slate-600">
            These are derived from the seeded phone inventory.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {exampleLookups.map((lookup) => (
            <article key={lookup.phone} className="rounded-[28px] border border-slate-100 bg-[#f8fbff] p-5">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{lookup.flag}</div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">{lookup.country}</p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    {lookup.country_code}
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm font-medium text-slate-800">{lookup.phone}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={lookup.is_valid ? "success" : "danger"}>
                  {lookup.is_valid ? "Valid" : "Invalid"}
                </Badge>
                <Badge tone="neutral">{lookup.line_type}</Badge>
              </div>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[#3182ce]" />
                  {lookup.carrier}
                </div>
                <div className="flex items-center gap-2">
                  {lookup.is_valid ? (
                    <BadgeCheck className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <ShieldAlert className="h-4 w-4 text-rose-600" />
                  )}
                  {lookup.is_valid ? "Ready for send" : "Review number"}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
