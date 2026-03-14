"use client";

import { useState } from "react";
import { Copy, KeyRound, Plus, Webhook } from "lucide-react";
import { formatTimestamp } from "@/lib/datetime";

type ApiKeyRow = {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
  is_active: boolean;
};

type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
} | null;

type SettingsWorkspaceProps = {
  initialKeys: ApiKeyRow[];
  initialWebhook: WebhookRow;
  organizationName: string;
  plan: string;
};

const eventOptions = [
  "campaign.sent",
  "message.delivered",
  "message.failed",
  "sentiment.updated",
] as const;

export function SettingsWorkspace({
  initialKeys,
  initialWebhook,
  organizationName,
  plan,
}: SettingsWorkspaceProps) {
  const [keys, setKeys] = useState(initialKeys);
  const [keyName, setKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState(initialWebhook?.url ?? "");
  const [events, setEvents] = useState<string[]>(initialWebhook?.events ?? [
    "campaign.sent",
    "message.delivered",
    "message.failed",
  ]);
  const [webhookCreatedAt, setWebhookCreatedAt] = useState<string | null>(
    initialWebhook?.created_at ?? null,
  );
  const [webhookSavedMessage, setWebhookSavedMessage] = useState<string | null>(
    null,
  );
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);

  const generateKey = async () => {
    setGeneratedKey(null);
    setKeyError(null);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: keyName,
        }),
      });

      const payload = (await response.json()) as
        | { key: string; record: ApiKeyRow }
        | { error: string };

      if (!response.ok || "error" in payload) {
        setKeyError("error" in payload ? payload.error : "Key generation failed.");
        return;
      }

      setKeys((current) => [payload.record, ...current]);
      setGeneratedKey(payload.key);
      setKeyName("");
    } catch {
      setKeyError("Key generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleEvent = (eventName: string) => {
    setWebhookSavedMessage(null);
    setWebhookError(null);
    setEvents((current) =>
      current.includes(eventName)
        ? current.filter((item) => item !== eventName)
        : [...current, eventName],
    );
  };

  const saveWebhook = async () => {
    setWebhookSavedMessage(null);
    setWebhookError(null);
    setIsSavingWebhook(true);

    try {
      const response = await fetch("/api/webhooks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          events,
        }),
      });

      const payload = (await response.json()) as
        | { id: string; url: string; events: string[]; created_at: string }
        | { error: string };

      if (!response.ok || "error" in payload) {
        setWebhookError("error" in payload ? payload.error : "Webhook save failed.");
        return;
      }

      if ("created_at" in payload && typeof payload.created_at === "string") {
        setWebhookCreatedAt(payload.created_at);
      }
      setWebhookSavedMessage("Webhook configuration saved.");
    } catch {
      setWebhookError("Webhook save failed.");
    } finally {
      setIsSavingWebhook(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
      <section className="surface-panel overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
                API Keys
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Workspace credentials
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Manage developer access for <span className="font-semibold text-slate-900">{organizationName}</span>.
              </p>
            </div>
            <div className="surface-muted grid gap-2 px-4 py-3 text-sm text-slate-600">
              <p className="font-semibold text-slate-900">{organizationName}</p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                {plan} plan
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
              onChange={(event) => setKeyName(event.target.value)}
              placeholder="Key name (optional)"
              value={keyName}
            />
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#3182ce] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isGenerating}
              onClick={generateKey}
              type="button"
            >
              <Plus className="h-4 w-4" />
              {isGenerating ? "Generating..." : "Generate New Key"}
            </button>
          </div>

          {generatedKey ? (
            <div className="mt-4 rounded-3xl border border-emerald-100 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-semibold text-emerald-700">
                New API key created. Copy it now, it will not be shown again.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <code className="overflow-x-auto rounded-2xl bg-white px-3 py-2 text-sm text-slate-900">
                  {generatedKey}
                </code>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  onClick={() => navigator.clipboard.writeText(generatedKey)}
                  type="button"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </button>
              </div>
            </div>
          ) : null}

          {keyError ? <p className="mt-4 text-sm text-rose-600">{keyError}</p> : null}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium">Last Used</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {keys.length === 0 ? (
                <tr>
                  <td className="px-6 py-12 text-center text-sm text-slate-500" colSpan={4}>
                    No API keys yet. Generate one for your developer team.
                  </td>
                </tr>
              ) : (
                keys.map((key) => (
                  <tr key={key.id} className="border-t border-slate-100 text-sm text-slate-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#3182ce]">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <span className="font-semibold text-slate-950">{key.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{formatTimestamp(key.created_at)}</td>
                    <td className="px-6 py-4">{formatTimestamp(key.last_used_at)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                          key.is_active
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {key.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
          Webhooks
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Delivery event subscriptions
        </h2>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          Configure the endpoint that receives delivery and sentiment events from ConversAI.
        </p>

        <label className="mt-8 block text-sm font-medium text-slate-800">
          Destination URL
          <div className="mt-2 flex items-center gap-3 rounded-3xl border border-slate-200 bg-[#f8fbff] px-4 py-3">
            <Webhook className="h-4 w-4 text-[#3182ce]" />
            <input
              className="w-full bg-transparent text-sm text-slate-900 outline-none"
              onChange={(event) => {
                setWebhookUrl(event.target.value);
                setWebhookSavedMessage(null);
                setWebhookError(null);
              }}
              placeholder="https://example.com/webhooks/conversai"
              value={webhookUrl}
            />
          </div>
        </label>

        <div className="mt-6">
          <p className="text-sm font-medium text-slate-800">Events</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {eventOptions.map((eventName) => {
              const active = events.includes(eventName);

              return (
                <button
                  key={eventName}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-[#3182ce] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  onClick={() => toggleEvent(eventName)}
                  type="button"
                >
                  {eventName}
                </button>
              );
            })}
          </div>
        </div>

        {webhookCreatedAt ? (
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
            Active webhook created {formatTimestamp(webhookCreatedAt)}
          </p>
        ) : null}

        <button
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSavingWebhook}
          onClick={saveWebhook}
          type="button"
        >
          {isSavingWebhook ? "Saving..." : "Save"}
        </button>

        {webhookSavedMessage ? (
          <p className="mt-4 text-sm text-emerald-600">{webhookSavedMessage}</p>
        ) : null}
        {webhookError ? <p className="mt-4 text-sm text-rose-600">{webhookError}</p> : null}
      </section>
    </div>
  );
}
