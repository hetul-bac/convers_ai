"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BadgeCheck,
  Cable,
  Copy,
  PlugZap,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import {
  demoSandboxCredentials,
  listProvidersForChannel,
  type ConnectorProvider,
  type ConnectorView,
} from "@/lib/connectors";
import { formatTimestamp } from "@/lib/datetime";
import { allowedChannels, type MessagingChannel } from "@/lib/messaging";

type ConnectorsWorkspaceProps = {
  initialConnectors: ConnectorView[];
};

const channelLabels: Record<MessagingChannel, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  rcs: "RCS",
  telegram: "Telegram",
  viber: "Viber",
};

function sortConnectors(connectors: ConnectorView[]) {
  return [...connectors].sort(
    (left, right) =>
      allowedChannels.indexOf(left.channel) - allowedChannels.indexOf(right.channel),
  );
}

function statusClasses(status: ConnectorView["status"]) {
  if (status === "connected") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "configured") {
    return "bg-amber-50 text-amber-700";
  }

  if (status === "error") {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-600";
}

export function ConnectorsWorkspace({
  initialConnectors,
}: ConnectorsWorkspaceProps) {
  const [connectors, setConnectors] = useState(sortConnectors(initialConnectors));
  const [channel, setChannel] = useState<MessagingChannel>("sms");
  const [provider, setProvider] = useState<ConnectorProvider>("conversai_sandbox");
  const [name, setName] = useState("");
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const providerOptions = useMemo(() => listProvidersForChannel(channel), [channel]);
  const activeDefinition =
    providerOptions.find((option) => option.provider === provider) ?? providerOptions[0];
  const selectedProvider = activeDefinition?.provider ?? "conversai_sandbox";
  const activeConnector =
    connectors.find((connector) => connector.channel === channel) ?? null;
  const stats = useMemo(
    () => ({
      configured: connectors.filter((connector) =>
        ["configured", "connected"].includes(connector.status),
      ).length,
      sandbox: connectors.filter(
        (connector) => connector.transport_mode === "sandbox",
      ).length,
      remaining: allowedChannels.length - connectors.length,
    }),
    [connectors],
  );

  const handleCredentialChange = (key: string, value: string) => {
    setCredentials((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const applySandboxCredentials = () => {
    setProvider("conversai_sandbox");
    setName(`${channelLabels[channel]} Sandbox Connector`);
    setCredentials({
      workspace_id: demoSandboxCredentials.workspace_id,
      app_key: demoSandboxCredentials.app_key,
      app_secret: demoSandboxCredentials.app_secret,
    });
    setMessage("Sandbox credentials applied. Save the connector to activate it.");
    setError(null);
  };

  const selectConnector = (connector: ConnectorView) => {
    setChannel(connector.channel);
    setProvider(connector.provider);
    setName(connector.name);
    setCredentials({});
    setMessage(
      "Loaded connector metadata. Re-enter credentials if you want to rotate or update secrets.",
    );
    setError(null);
  };

  const saveConnector = () => {
    startTransition(async () => {
      setMessage(null);
      setError(null);

      const response = await fetch("/api/connectors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          channel,
          provider: selectedProvider,
          credentials,
        }),
      });

      const payload = (await response.json()) as
        | { connector: ConnectorView; message: string }
        | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Failed to save connector.");
        return;
      }

      setConnectors((current) =>
        sortConnectors([
          payload.connector,
          ...current.filter((connector) => connector.channel !== payload.connector.channel),
        ]),
      );
      setMessage(payload.message);
      setCredentials({});
    });
  };

  const copySandboxBundle = async () => {
    await navigator.clipboard.writeText(
      JSON.stringify(demoSandboxCredentials, null, 2),
    );
    setMessage("Sandbox credential bundle copied.");
    setError(null);
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Configured Channels</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {stats.configured}
          </p>
        </article>
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Sandbox Connectors</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {stats.sandbox}
          </p>
        </article>
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Channels Remaining</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {Math.max(stats.remaining, 0)}
          </p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.9fr)]">
        <section className="surface-panel p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
                Connector Builder
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Connect each messaging channel
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Save channel credentials here so the unified messaging API knows
                which provider profile to use. Real provider transport is still
                simulated in this MVP.
              </p>
            </div>
            {activeConnector ? (
              <div className="surface-muted flex items-center gap-3 px-4 py-3 text-sm text-slate-700">
                <ShieldCheck className="h-4 w-4 text-[#3182ce]" />
                <div>
                  <p className="font-semibold text-slate-950">
                    Current {channelLabels[channel]} connector
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                    {activeConnector.provider_label} • {activeConnector.status}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-800">
              Channel
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                onChange={(event) => {
                  const nextChannel = event.target.value as MessagingChannel;
                  const nextProviders = listProvidersForChannel(nextChannel);
                  setChannel(nextChannel);
                  setProvider(
                    nextProviders.some((option) => option.provider === provider)
                      ? provider
                      : (nextProviders[0]?.provider ?? "conversai_sandbox"),
                  );
                  setMessage(null);
                  setError(null);
                }}
                value={channel}
              >
                {allowedChannels.map((value) => (
                  <option key={value} value={value}>
                    {channelLabels[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-800">
              Provider
              <select
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                onChange={(event) => {
                  setProvider(event.target.value as ConnectorProvider);
                  setMessage(null);
                  setError(null);
                }}
                value={selectedProvider}
              >
                {providerOptions.map((option) => (
                  <option key={option.provider} value={option.provider}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-5 block text-sm font-medium text-slate-800">
            Connector Name
            <input
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
              onChange={(event) => setName(event.target.value)}
              placeholder={`${channelLabels[channel]} Provider`}
              value={name}
            />
          </label>

          <div className="mt-5 rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
            <p className="text-sm font-semibold text-slate-950">
              {activeDefinition?.label ?? "Provider"}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {activeDefinition?.description}
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {activeDefinition?.fields.map((field) => (
              <label key={field.key} className="text-sm font-medium text-slate-800">
                {field.label}
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                  onChange={(event) =>
                    handleCredentialChange(field.key, event.target.value)
                  }
                  placeholder={field.placeholder}
                  type={field.secret ? "password" : "text"}
                  value={credentials[field.key] ?? ""}
                />
                <span className="mt-2 block text-xs leading-5 text-slate-500">
                  {field.description}
                </span>
              </label>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={saveConnector}
              type="button"
            >
              <PlugZap className="h-4 w-4" />
              {isPending ? "Saving..." : "Save Connector"}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              onClick={applySandboxCredentials}
              type="button"
            >
              <BadgeCheck className="h-4 w-4" />
              Use Sandbox Demo
            </button>
          </div>

          {message ? <p className="mt-4 text-sm text-emerald-600">{message}</p> : null}
          {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
        </section>

        <section className="space-y-6">
          <article className="surface-panel p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
                  Demo Access
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Published sandbox credentials
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  These values only work with the built-in `ConversAI Sandbox`
                  provider. They do not bypass real third-party authentication.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={copySandboxBundle}
                type="button"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Bundle
              </button>
            </div>

            <div className="mt-6 grid gap-3">
              <div className="surface-muted px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">Workspace ID</p>
                <code className="mt-2 block text-xs text-slate-700">
                  {demoSandboxCredentials.workspace_id}
                </code>
              </div>
              <div className="surface-muted px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">App Key</p>
                <code className="mt-2 block text-xs text-slate-700">
                  {demoSandboxCredentials.app_key}
                </code>
              </div>
              <div className="surface-muted px-4 py-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-950">App Secret</p>
                <code className="mt-2 block text-xs text-slate-700">
                  {demoSandboxCredentials.app_secret}
                </code>
              </div>
            </div>
          </article>

          <article className="surface-panel p-6">
            <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
              Delivery Mode
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              What happens after a connector is saved
            </h2>
            <div className="mt-6 grid gap-4">
              <div className="surface-muted flex items-start gap-3 px-4 py-4 text-sm text-slate-700">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-950">Sandbox mode</p>
                  <p className="mt-1 text-slate-600">
                    The connector is treated as connected and messages stay in
                    the built-in simulator for safe testing.
                  </p>
                </div>
              </div>
              <div className="surface-muted flex items-start gap-3 px-4 py-4 text-sm text-slate-700">
                <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <p className="font-semibold text-slate-950">
                    Bring-your-own credentials
                  </p>
                  <p className="mt-1 text-slate-600">
                    The app validates credential shape and stores the connector
                    as configured, but external provider verification is still
                    outside this hackathon MVP.
                  </p>
                </div>
              </div>
            </div>
          </article>
        </section>
      </div>

      <section className="surface-panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#3182ce]">
            <Cable className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">
              Channel connectors
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              One connector profile per supported channel.
            </p>
          </div>
        </div>

        <div className="grid gap-4 p-6 lg:grid-cols-2">
          {connectors.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 lg:col-span-2">
              No connectors yet. Start with the sandbox profile or save real
              provider credentials for simulated testing.
            </div>
          ) : (
            connectors.map((connector) => (
              <article
                key={connector.id}
                className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      {channelLabels[connector.channel]}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-950">
                      {connector.name}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600">
                      {connector.provider_label}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${statusClasses(
                      connector.status,
                    )}`}
                  >
                    {connector.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="surface-muted px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Transport
                    </p>
                    <p className="mt-2 font-semibold text-slate-950">
                      {connector.transport_mode === "sandbox"
                        ? "Sandbox"
                        : "Simulated BYOC"}
                    </p>
                  </div>
                  <div className="surface-muted px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Last Tested
                    </p>
                    <p className="mt-2 font-semibold text-slate-950">
                      {formatTimestamp(connector.last_tested_at)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {Object.entries(connector.config_summary).map(([key, value]) => (
                    <div
                      key={`${connector.id}-${key}`}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    >
                      <span className="font-medium text-slate-600">{key}</span>
                      <code className="text-xs text-slate-900">{value}</code>
                    </div>
                  ))}
                </div>

                {connector.error_message ? (
                  <p className="mt-4 text-sm text-rose-600">
                    {connector.error_message}
                  </p>
                ) : null}

                <div className="mt-5 flex justify-end">
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    onClick={() => selectConnector(connector)}
                    type="button"
                  >
                    <PlugZap className="h-4 w-4" />
                    Edit Connector
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
