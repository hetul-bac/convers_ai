"use client";

import { useState } from "react";
import {
  Copy,
  MessageCircle,
  Radio,
  Send,
  Smartphone,
  Sparkles,
} from "lucide-react";

const availableChannels = [
  { value: "sms", label: "SMS", icon: Smartphone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { value: "rcs", label: "RCS", icon: Sparkles },
  { value: "telegram", label: "Telegram", icon: Send },
  { value: "viber", label: "Viber", icon: Radio },
];

type OptimizationValue =
  | string
  | {
      title?: string;
      body?: string;
      suggestions?: unknown[];
    }
  | unknown[];

type OptimizationResult = Record<string, OptimizationValue>;

function formatOptimizationValue(value: OptimizationValue): string {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => formatOptimizationValue(item as OptimizationValue))
      .filter(Boolean)
      .join("\n");
  }

  if (value && typeof value === "object") {
    const parts = [value.title, value.body]
      .filter((part): part is string => typeof part === "string" && part.length > 0);

    if (Array.isArray(value.suggestions) && value.suggestions.length > 0) {
      parts.push(
        value.suggestions
          .map((item) => `- ${formatOptimizationValue(item as OptimizationValue)}`)
          .join("\n"),
      );
    }

    if (parts.length > 0) {
      return parts.join("\n\n");
    }

    return JSON.stringify(value, null, 2);
  }

  return String(value ?? "");
}

export function OptimizeWorkspace() {
  const [message, setMessage] = useState(
    "Your plan renews tomorrow. Upgrade today to unlock AI-driven campaign optimization and premium reach.",
  );
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    "sms",
    "whatsapp",
    "rcs",
  ]);
  const [results, setResults] = useState<OptimizationResult>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleChannel = (channel: string) => {
    setSelectedChannels((current) =>
      current.includes(channel)
        ? current.filter((value) => value !== channel)
        : [...current, channel],
    );
  };

  const handleOptimize = async () => {
    if (selectedChannels.length === 0) {
      setError("Select at least one channel.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          channels: selectedChannels,
        }),
      });

      if (!response.ok) {
        throw new Error("Optimization failed.");
      }

      const payload = (await response.json()) as OptimizationResult;
      setResults(payload);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Optimization failed.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const orderedResults = Object.entries(results).sort(
    ([left], [right]) =>
      selectedChannels.indexOf(left) - selectedChannels.indexOf(right),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <section className="surface-panel p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
          AI Message Studio
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          Optimize copy channel by channel.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
          Generate tighter SMS copy, richer RCS prompts, and friendlier chat
          variants from one source message.
        </p>

        <label className="mt-8 block text-sm font-medium text-slate-800">
          Source Message
          <textarea
            className="mt-3 h-48 w-full rounded-3xl border border-slate-200 bg-[#f8fbff] px-5 py-4 text-sm text-slate-900 outline-none transition focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
            onChange={(event) => setMessage(event.target.value)}
            value={message}
          />
        </label>

        <div className="mt-6">
          <p className="text-sm font-medium text-slate-800">Channels</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {availableChannels.map(({ value, label, icon: Icon }) => {
              const active = selectedChannels.includes(value);

              return (
                <button
                  key={value}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-[#3182ce] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                  onClick={() => toggleChannel(value)}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <button
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading}
          onClick={handleOptimize}
          type="button"
        >
          <Sparkles className="h-4 w-4" />
          {isLoading ? "Optimizing..." : "Optimize with AI"}
        </button>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
        {orderedResults.length === 0 ? (
          <div className="surface-panel flex min-h-[320px] items-center justify-center p-8 text-center text-slate-500">
            Optimized channel variants will appear here.
          </div>
        ) : (
          orderedResults.map(([channel, copy]) => {
            const channelConfig =
              availableChannels.find((item) => item.value === channel) ??
              availableChannels[0];
            const Icon = channelConfig.icon;
            const formattedCopy = formatOptimizationValue(copy);

            return (
              <article key={channel} className="surface-panel p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#3182ce]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                        Optimized
                      </p>
                      <h2 className="mt-1 text-lg font-semibold text-slate-950">
                        {channelConfig.label}
                      </h2>
                    </div>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => navigator.clipboard.writeText(formattedCopy)}
                    type="button"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </button>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">
                  {formattedCopy}
                </p>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
