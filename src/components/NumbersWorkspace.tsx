"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Globe2, Phone, Plus, ShieldCheck, X } from "lucide-react";
import { formatTimestamp } from "@/lib/datetime";
import { phoneCountries } from "@/lib/phoneLookup";

type PhoneNumberRow = {
  id: string;
  number: string;
  country_code: string;
  carrier: string | null;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  country: string;
  flag: string;
};

type NumbersWorkspaceProps = {
  initialNumbers: PhoneNumberRow[];
};

export function NumbersWorkspace({ initialNumbers }: NumbersWorkspaceProps) {
  const [numbers, setNumbers] = useState(initialNumbers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCountryCode, setSelectedCountryCode] = useState("IN");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    document.body.classList.toggle("overflow-hidden", isModalOpen);

    return () => {
      document.body.classList.remove("overflow-hidden");
    };
  }, [isModalOpen]);

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleProvision = () => {
    startTransition(async () => {
      setError(null);
      setFeedback(null);

      const response = await fetch("/api/numbers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          country_code: selectedCountryCode,
        }),
      });

      const payload = (await response.json()) as PhoneNumberRow | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Provisioning failed.");
        return;
      }

      setNumbers((current) => [payload, ...current]);
      setFeedback(`Provisioned ${payload.number} for ${payload.country}.`);
      closeModal();
    });
  };

  const portalTarget = typeof document === "undefined" ? null : document.body;

  return (
    <>
      <section className="surface-panel overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
                Number Inventory
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                Manage provisioned phone numbers
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Demo inventory spans multiple markets with active/inactive status and
                verification state for the dashboard.
              </p>
            </div>
            <button
              className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8]"
              onClick={() => setIsModalOpen(true)}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Provision Number
            </button>
          </div>

          {feedback ? <p className="mt-4 text-sm text-emerald-600">{feedback}</p> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Number</th>
                <th className="px-6 py-4 font-medium">Country</th>
                <th className="px-6 py-4 font-medium">Carrier</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {numbers.length === 0 ? (
                <tr>
                  <td className="px-6 py-10 text-center text-sm text-slate-500" colSpan={5}>
                    No numbers provisioned yet.
                  </td>
                </tr>
              ) : (
                numbers.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100 text-sm text-slate-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#3182ce]">
                          <Phone className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-950">{row.number}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                            {row.country_code}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{row.flag}</span>
                        <span>{row.country}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{row.carrier ?? "Unknown"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                            row.is_active
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {row.is_active ? "Active" : "Inactive"}
                        </span>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                            row.is_verified
                              ? "bg-[#ebf5ff] text-[#3182ce]"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {row.is_verified ? "Verified" : "Pending"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{formatTimestamp(row.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {portalTarget && isModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-8">
              <div className="surface-panel w-full max-w-xl p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
                      Provision Number
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                      Generate a local market number
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Pick a supported market and the app will simulate provisioning.
                    </p>
                  </div>
                  <button
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500"
                    onClick={closeModal}
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <label className="mt-8 block text-sm font-medium text-slate-800">
                  Country
                  <div className="mt-2 flex items-center gap-3 rounded-[28px] border border-slate-200 bg-[#f8fbff] px-4 py-4">
                    <Globe2 className="h-4 w-4 text-[#3182ce]" />
                    <select
                      className="w-full bg-transparent text-sm text-slate-900 outline-none"
                      onChange={(event) => setSelectedCountryCode(event.target.value)}
                      value={selectedCountryCode}
                    >
                      {phoneCountries.map((country) => (
                        <option key={country.isoCode} value={country.isoCode}>
                          {country.flag} {country.country} ({country.isoCode})
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <div className="mt-6 surface-muted flex items-center gap-3 px-4 py-4 text-sm text-slate-600">
                  <ShieldCheck className="h-4 w-4 text-[#3182ce]" />
                  Newly provisioned numbers are active immediately and await verification.
                </div>

                {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

                <div className="mt-8 flex justify-end">
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={handleProvision}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    {isPending ? "Provisioning..." : "Provision Number"}
                  </button>
                </div>
              </div>
            </div>,
            portalTarget,
          )
        : null}
    </>
  );
}
