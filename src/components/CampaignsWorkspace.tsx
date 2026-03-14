"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Megaphone, Plus, Send, Users, X } from "lucide-react";
import { formatTimestamp } from "@/lib/datetime";

const channelOptions = ["sms", "whatsapp", "rcs", "telegram", "viber"] as const;

type CampaignRow = {
  id: string;
  name: string;
  channels: string[];
  status: string;
  sent_count: number;
  delivered_count: number;
  created_at: string;
};

type CampaignsWorkspaceProps = {
  contactCount: number;
  initialCampaigns: CampaignRow[];
};

export function CampaignsWorkspace({
  contactCount,
  initialCampaigns,
}: CampaignsWorkspaceProps) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [audienceCount, setAudienceCount] = useState(contactCount);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [channels, setChannels] = useState<string[]>(["sms", "whatsapp"]);
  const [error, setError] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
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

  const totals = useMemo(
    () => ({
      campaigns: campaigns.length,
      sent: campaigns.reduce((sum, campaign) => sum + campaign.sent_count, 0),
      delivered: campaigns.reduce(
        (sum, campaign) => sum + campaign.delivered_count,
        0,
      ),
    }),
    [campaigns],
  );

  const resetForm = () => {
    setName("");
    setMessageBody("");
    setChannels(["sms", "whatsapp"]);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
    setHelperMessage(null);
  };

  const toggleChannel = (channel: string) => {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel],
    );
  };

  const handleCreateCampaign = () => {
    startTransition(async () => {
      if (!name.trim() || !messageBody.trim() || channels.length === 0) {
        setError("Name, message, and at least one channel are required.");
        return;
      }

      setError(null);
      setHelperMessage(null);

      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          message_body: messageBody,
          channels,
        }),
      });

      const payload = (await response.json()) as CampaignRow | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Campaign send failed.");
        return;
      }

      setCampaigns((current) => [payload, ...current]);
      closeModal();
    });
  };

  const handleGenerateContacts = () => {
    startTransition(async () => {
      setError(null);
      setHelperMessage(null);

      const response = await fetch("/api/contacts/bootstrap", {
        method: "POST",
      });

      const payload = (await response.json()) as
        | { inserted: number; total_contacts: number }
        | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Failed to create contacts.");
        return;
      }

      setAudienceCount(payload.total_contacts);
      setHelperMessage(
        payload.inserted > 0
          ? `${payload.inserted} starter contacts created.`
          : `Audience already has ${payload.total_contacts} contacts.`,
      );
    });
  };

  const portalTarget = typeof document === "undefined" ? null : document.body;
  const modal =
    portalTarget && isModalOpen
      ? createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-8">
            <div className="surface-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
                    New Campaign
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                    Prepare a cross-channel broadcast
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    This send will target all available contacts in your organization.
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

              <div className="mt-6 grid gap-5">
                <div className="surface-muted flex items-center gap-3 px-4 py-4 text-sm text-slate-700">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#3182ce]">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-950">
                      Audience size: {audienceCount} contacts
                    </p>
                    <p className="mt-1 text-slate-600">
                      Each selected channel sends one message per contact.
                    </p>
                  </div>
                </div>

                <label className="text-sm font-medium text-slate-800">
                  Campaign name
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                    onChange={(event) => setName(event.target.value)}
                    value={name}
                  />
                </label>

                <label className="text-sm font-medium text-slate-800">
                  Message body
                  <textarea
                    className="mt-2 h-36 w-full rounded-3xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                    onChange={(event) => setMessageBody(event.target.value)}
                    value={messageBody}
                  />
                </label>

                <div>
                  <p className="text-sm font-medium text-slate-800">Channels</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {channelOptions.map((channel) => {
                      const active = channels.includes(channel);

                      return (
                        <button
                          key={channel}
                          className={`rounded-full px-4 py-2 text-sm font-medium uppercase tracking-[0.14em] transition ${
                            active
                              ? "bg-[#3182ce] text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                          onClick={() => toggleChannel(channel)}
                          type="button"
                        >
                          {channel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
              {helperMessage ? (
                <p className="mt-4 text-sm text-emerald-600">{helperMessage}</p>
              ) : null}

              {audienceCount === 0 ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2769a8]"
                    href="/contacts"
                    onClick={closeModal}
                  >
                    <Users className="h-4 w-4" />
                    Manage Contacts
                  </Link>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={handleGenerateContacts}
                    type="button"
                  >
                    <Users className="h-4 w-4" />
                    Generate Starter Contacts
                  </button>
                </div>
              ) : null}

              <div className="mt-8 flex justify-end">
                <button
                  className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isPending || audienceCount === 0}
                  onClick={handleCreateCampaign}
                  type="button"
                >
                  {isPending ? (
                    <Megaphone className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isPending ? "Sending Broadcast..." : "Send Broadcast"}
                </button>
              </div>
            </div>
          </div>,
          portalTarget,
        )
      : null;

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Campaigns</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {totals.campaigns}
          </p>
        </article>
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Sent</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {totals.sent}
          </p>
        </article>
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Delivered</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {totals.delivered}
          </p>
        </article>
      </section>

      <section className="surface-panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Campaign roster
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Review channel mix, current status, and broadcast performance.
            </p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8]"
            onClick={() => {
              setError(null);
              setHelperMessage(null);
              setIsModalOpen(true);
            }}
            type="button"
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Channel</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Sent</th>
                <th className="px-6 py-4 font-medium">Delivered</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length === 0 ? (
                <tr>
                  <td
                    className="px-6 py-16 text-center text-sm text-slate-500"
                    colSpan={5}
                  >
                    No campaigns yet. Start with a new outbound send.
                  </td>
                </tr>
              ) : (
                campaigns.map((campaign) => (
                  <tr
                    key={campaign.id}
                    className="border-t border-slate-100 text-sm text-slate-700"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-950">{campaign.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatTimestamp(campaign.created_at)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-2">
                        {campaign.channels.map((channel) => (
                          <span
                            key={`${campaign.id}-${channel}`}
                            className="accent-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]"
                          >
                            {channel}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-950">
                      {campaign.sent_count}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-950">
                      {campaign.delivered_count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modal}
    </>
  );
}
