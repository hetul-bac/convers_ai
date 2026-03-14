"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { FileText, Plus, Sparkles, X } from "lucide-react";
import { formatTimestamp } from "@/lib/datetime";
import { allowedChannels } from "@/lib/messaging";

type TemplateRow = {
  id: string;
  name: string;
  body: string;
  channel: string;
  variables: string[];
  is_approved: boolean;
  created_at: string;
};

type TemplatesWorkspaceProps = {
  initialTemplates: TemplateRow[];
};

function extractVariables(body: string) {
  const matches = body.match(/\{[^}]+\}/g) ?? [];
  return Array.from(
    new Set(
      matches
        .map((match) => match.replace(/[{}]/g, "").trim())
        .filter(Boolean),
    ),
  );
}

function renderHighlightedBody(body: string) {
  return body.split(/(\{[^}]+\})/g).map((segment, index) => {
    if (/^\{[^}]+\}$/.test(segment)) {
      return (
        <span
          key={`${segment}-${index}`}
          className="rounded-md bg-[#ebf5ff] px-1.5 py-0.5 text-[#3182ce]"
        >
          {segment}
        </span>
      );
    }

    return <span key={`${segment}-${index}`}>{segment}</span>;
  });
}

export function TemplatesWorkspace({ initialTemplates }: TemplatesWorkspaceProps) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("sms");
  const [body, setBody] = useState(
    "Hi {first_name}, your order {order_id} is now {status}.",
  );
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
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

  const detectedVariables = extractVariables(body);
  const filteredTemplates =
    activeChannel === "all"
      ? templates
      : templates.filter((template) => template.channel === activeChannel);
  const portalTarget = typeof document === "undefined" ? null : document.body;

  const closeModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

  const handleSave = () => {
    startTransition(async () => {
      setError(null);
      setFeedback(null);

      const response = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          body,
          channel,
          variables: detectedVariables,
        }),
      });

      const payload = (await response.json()) as TemplateRow | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Template creation failed.");
        return;
      }

      setTemplates((current) => [payload, ...current]);
      setFeedback(`Created template "${payload.name}".`);
      setName("");
      setChannel("sms");
      setBody("Hi {first_name}, your order {order_id} is now {status}.");
      closeModal();
    });
  };

  return (
    <>
      <div className="space-y-6">
        <section className="surface-panel overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
                  Template Library
                </p>
                <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                  Channel-ready message templates
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                  Filter by channel, review approval state, and add new placeholder-driven
                  templates for campaigns and triggered sends.
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8]"
                onClick={() => setIsModalOpen(true)}
                type="button"
              >
                <Plus className="h-4 w-4" />
                New Template
              </button>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {["all", ...allowedChannels].map((item) => {
                const active = activeChannel === item;

                return (
                  <button
                    key={item}
                    className={`rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] transition ${
                      active
                        ? "bg-[#3182ce] text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    onClick={() => setActiveChannel(item)}
                    type="button"
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {feedback ? <p className="mt-4 text-sm text-emerald-600">{feedback}</p> : null}
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.length === 0 ? (
              <div className="surface-muted col-span-full px-5 py-8 text-center text-sm text-slate-500">
                No templates match this channel yet.
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <article key={template.id} className="rounded-[30px] border border-slate-100 bg-[#f8fbff] p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-[#ebf5ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#3182ce]">
                      {template.channel}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        template.is_approved
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {template.is_approved ? "Approved" : "Draft"}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-950">
                    {template.name}
                  </h3>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    {renderHighlightedBody(template.body)}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {template.variables.map((variable) => (
                      <span
                        key={variable}
                        className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
                      >
                        {`{${variable}}`}
                      </span>
                    ))}
                  </div>
                  <p className="mt-5 text-xs uppercase tracking-[0.16em] text-slate-400">
                    Created {formatTimestamp(template.created_at)}
                  </p>
                </article>
              ))
            )}
          </div>
        </section>
      </div>

      {portalTarget && isModalOpen
        ? createPortal(
            <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4 py-8">
              <div className="surface-panel max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
                      New Template
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold text-slate-950">
                      Create a reusable message block
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Variables are detected from <code>{"{placeholder}"}</code> tokens in the body.
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

                <div className="mt-8 grid gap-5">
                  <label className="text-sm font-medium text-slate-800">
                    Template name
                    <input
                      className="mt-2 w-full rounded-[28px] border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                      onChange={(event) => setName(event.target.value)}
                      value={name}
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-800">
                    Channel
                    <select
                      className="mt-2 w-full rounded-[28px] border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                      onChange={(event) => setChannel(event.target.value)}
                      value={channel}
                    >
                      {allowedChannels.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium text-slate-800">
                    Body
                    <textarea
                      className="mt-2 h-36 w-full rounded-[28px] border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                      onChange={(event) => setBody(event.target.value)}
                      value={body}
                    />
                  </label>

                  <div className="surface-muted px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#3182ce]" />
                      <p className="text-sm font-semibold text-slate-950">
                        Detected variables
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {detectedVariables.length === 0 ? (
                        <span className="text-sm text-slate-500">
                          Add <code>{"{placeholder}"}</code> tokens to detect variables.
                        </span>
                      ) : (
                        detectedVariables.map((variable) => (
                          <span
                            key={variable}
                            className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm"
                          >
                            {`{${variable}}`}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="mt-5 rounded-[20px] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                      {renderHighlightedBody(body)}
                    </div>
                  </div>
                </div>

                {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}

                <div className="mt-8 flex justify-end">
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={handleSave}
                    type="button"
                  >
                    <FileText className="h-4 w-4" />
                    {isPending ? "Saving..." : "Save Template"}
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
