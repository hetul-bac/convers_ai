"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Play,
  Plus,
  Save,
  Sparkles,
  Target,
  Trash2,
  Workflow,
} from "lucide-react";
import {
  chatbotNodeTypes,
  cloneChatbotGraph,
  type ChatbotGraph,
  type ChatbotIntentRecord,
  type ChatbotNodeRecord,
} from "@/lib/chatbots";
import { formatTimestamp } from "@/lib/datetime";
import { allowedChannels, type MessagingChannel } from "@/lib/messaging";

type ChatbotsWorkspaceProps = {
  initialBots: ChatbotGraph[];
};

type NlpResult = {
  mode: "heuristic" | "model";
  intent_id: string | null;
  intent_name: string | null;
  confidence: number;
  rationale: string;
  suggested_reply: string;
  matched_examples: string[];
  flow_preview: Array<{
    node_key: string;
    title: string;
    node_type: string;
    content: string;
  }>;
};

const channelLabels: Record<MessagingChannel, string> = {
  sms: "SMS",
  whatsapp: "WhatsApp",
  rcs: "RCS",
  telegram: "Telegram",
  viber: "Viber",
};

function createClientId() {
  return globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}`;
}

function normalizeBots(bots: ChatbotGraph[]) {
  return [...bots].sort(
    (left, right) =>
      new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime(),
  );
}

export function ChatbotsWorkspace({ initialBots }: ChatbotsWorkspaceProps) {
  const [bots, setBots] = useState(normalizeBots(initialBots));
  const [selectedBotId, setSelectedBotId] = useState<string | null>(
    initialBots[0]?.id ?? null,
  );
  const [draftBot, setDraftBot] = useState<ChatbotGraph | null>(
    initialBots[0] ? cloneChatbotGraph(initialBots[0]) : null,
  );
  const [testerInput, setTesterInput] = useState("Where is my order update?");
  const [testerResult, setTesterResult] = useState<NlpResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const stats = useMemo(
    () => ({
      totalBots: bots.length,
      published: bots.filter((bot) => bot.status === "published").length,
      intents: bots.reduce((sum, bot) => sum + bot.intents.length, 0),
    }),
    [bots],
  );

  const selectBot = (botId: string) => {
    const selected = bots.find((bot) => bot.id === botId);

    if (!selected) {
      return;
    }

    setSelectedBotId(botId);
    setDraftBot(cloneChatbotGraph(selected));
    setTesterResult(null);
    setMessage(null);
    setError(null);
  };

  const updateBot = <K extends keyof ChatbotGraph>(key: K, value: ChatbotGraph[K]) => {
    setDraftBot((current) => (current ? { ...current, [key]: value } : current));
  };

  const updateIntent = (
    intentId: string,
    updater: (intent: ChatbotIntentRecord) => ChatbotIntentRecord,
  ) => {
    setDraftBot((current) =>
      current
        ? {
            ...current,
            intents: current.intents.map((intent) =>
              intent.id === intentId ? updater(intent) : intent,
            ),
          }
        : current,
    );
  };

  const updateNode = (
    nodeId: string,
    updater: (node: ChatbotNodeRecord) => ChatbotNodeRecord,
  ) => {
    setDraftBot((current) =>
      current
        ? {
            ...current,
            nodes: current.nodes.map((node) =>
              node.id === nodeId ? updater(node) : node,
            ),
          }
        : current,
    );
  };

  const addIntent = () => {
    setDraftBot((current) =>
      current
        ? {
            ...current,
            intents: [
              ...current.intents,
              {
                id: createClientId(),
                name: `intent_${current.intents.length + 1}`,
                description: null,
                sample_utterances: ["Example utterance"],
                response_template: "Thanks for your message. Update this response.",
                priority: 50,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          }
        : current,
    );
  };

  const removeIntent = (intentId: string) => {
    setDraftBot((current) =>
      current
        ? {
            ...current,
            intents: current.intents.filter((intent) => intent.id !== intentId),
            nodes: current.nodes.map((node) =>
              node.intent_id === intentId
                ? {
                    ...node,
                    intent_id: null,
                  }
                : node,
            ),
          }
        : current,
    );
  };

  const addNode = () => {
    setDraftBot((current) =>
      current
        ? {
            ...current,
            nodes: [
              ...current.nodes,
              {
                id: createClientId(),
                intent_id: null,
                node_key: `node_${current.nodes.length + 1}`,
                title: `Step ${current.nodes.length + 1}`,
                node_type: "message",
                content: "Describe what the bot should say or do at this step.",
                next_node_key: null,
                step_order: current.nodes.length + 1,
                position_x: current.nodes.length * 240,
                position_y: 0,
                metadata: {},
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          }
        : current,
    );
  };

  const removeNode = (nodeId: string) => {
    setDraftBot((current) =>
      current
        ? {
            ...current,
            nodes: current.nodes.filter((node) => node.id !== nodeId),
          }
        : current,
    );
  };

  const createBot = () => {
    startTransition(async () => {
      setMessage(null);
      setError(null);

      const response = await fetch("/api/chatbots", {
        method: "POST",
      });

      const payload = (await response.json()) as ChatbotGraph | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Failed to create chatbot.");
        return;
      }

      setBots((current) => normalizeBots([payload, ...current]));
      setSelectedBotId(payload.id);
      setDraftBot(cloneChatbotGraph(payload));
      setMessage("Starter chatbot created.");
    });
  };

  const saveBot = (nextStatus?: ChatbotGraph["status"]) => {
    if (!draftBot) {
      return;
    }

    startTransition(async () => {
      setMessage(null);
      setError(null);

      const response = await fetch("/api/chatbots", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...draftBot,
          status: nextStatus ?? draftBot.status,
        }),
      });

      const payload = (await response.json()) as ChatbotGraph | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Failed to save chatbot.");
        return;
      }

      setBots((current) =>
        normalizeBots([
          payload,
          ...current.filter((bot) => bot.id !== payload.id),
        ]),
      );
      setSelectedBotId(payload.id);
      setDraftBot(cloneChatbotGraph(payload));
      setMessage(
        nextStatus === "published"
          ? "Chatbot published."
          : "Chatbot draft saved.",
      );
    });
  };

  const runIntentTest = () => {
    if (!draftBot) {
      return;
    }

    startTransition(async () => {
      setTesterResult(null);
      setMessage(null);
      setError(null);

      const response = await fetch("/api/chatbots/nlp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          utterance: testerInput,
          bot: draftBot,
        }),
      });

      const payload = (await response.json()) as NlpResult | { error: string };

      if (!response.ok || "error" in payload) {
        setError("error" in payload ? payload.error : "Failed to test intent.");
        return;
      }

      setTesterResult(payload);
    });
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Automation Bots</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {stats.totalBots}
          </p>
        </article>
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Published</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {stats.published}
          </p>
        </article>
        <article className="surface-panel p-5">
          <p className="text-sm text-slate-500">Intent Library</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {stats.intents}
          </p>
        </article>
      </section>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="surface-panel p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
                Chatbots
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Bot roster
              </h2>
            </div>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#3182ce] text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isPending}
              onClick={createBot}
              type="button"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {bots.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No chatbots yet. Create your first automation bot.
              </div>
            ) : (
              bots.map((bot) => (
                <button
                  key={bot.id}
                  className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                    bot.id === selectedBotId
                      ? "border-[#3182ce] bg-[#ebf5ff]"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                  }`}
                  onClick={() => selectBot(bot.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-950">{bot.name}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {bot.description ?? "No description yet."}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                        bot.status === "published"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {bot.status}
                    </span>
                  </div>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                    Updated {formatTimestamp(bot.updated_at)}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <div className="space-y-6">
          {!draftBot ? (
            <section className="surface-panel px-6 py-16 text-center text-sm text-slate-500">
              Create a chatbot to start building intents and flow steps.
            </section>
          ) : (
            <>
              <section className="surface-panel p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
                      Builder
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                      Configure the bot profile
                    </h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                      Define the assistant persona, choose a default channel, and
                      set the welcome and fallback messages used by the flow.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPending}
                      onClick={() => saveBot()}
                      type="button"
                    >
                      <Save className="h-4 w-4" />
                      Save Draft
                    </button>
                    <button
                      className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPending}
                      onClick={() => saveBot("published")}
                      type="button"
                    >
                      <BadgeCheck className="h-4 w-4" />
                      Publish Bot
                    </button>
                  </div>
                </div>

                <div className="mt-8 grid gap-5 lg:grid-cols-2">
                  <label className="text-sm font-medium text-slate-800">
                    Bot Name
                    <input
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                      onChange={(event) => updateBot("name", event.target.value)}
                      value={draftBot.name}
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-800">
                    Default Channel
                    <select
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                      onChange={(event) =>
                        updateBot(
                          "default_channel",
                          event.target.value as MessagingChannel,
                        )
                      }
                      value={draftBot.default_channel ?? "whatsapp"}
                    >
                      {allowedChannels.map((channel) => (
                        <option key={channel} value={channel}>
                          {channelLabels[channel]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="mt-5 block text-sm font-medium text-slate-800">
                  Description
                  <textarea
                    className="mt-2 h-24 w-full rounded-3xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                    onChange={(event) => updateBot("description", event.target.value)}
                    value={draftBot.description ?? ""}
                  />
                </label>

                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <label className="text-sm font-medium text-slate-800">
                    Welcome Message
                    <textarea
                      className="mt-2 h-28 w-full rounded-3xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                      onChange={(event) =>
                        updateBot("welcome_message", event.target.value)
                      }
                      value={draftBot.welcome_message}
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-800">
                    Fallback Message
                    <textarea
                      className="mt-2 h-28 w-full rounded-3xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                      onChange={(event) =>
                        updateBot("fallback_message", event.target.value)
                      }
                      value={draftBot.fallback_message}
                    />
                  </label>
                </div>
              </section>

              <section className="surface-panel p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
                      Intent Library
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                      Train the NLP layer
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Add training phrases, descriptions, and the default response
                      each intent should trigger.
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8]"
                    onClick={addIntent}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    Add Intent
                  </button>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {draftBot.intents.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 xl:col-span-2">
                      No intents yet. Add the first intent to train recognition.
                    </div>
                  ) : (
                    draftBot.intents.map((intent) => (
                      <article
                        key={intent.id}
                        className="rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#3182ce]">
                              <Target className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                Intent
                              </p>
                              <p className="mt-1 font-semibold text-slate-950">
                                {intent.name}
                              </p>
                            </div>
                          </div>
                          <button
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                            onClick={() => removeIntent(intent.id)}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-5 grid gap-4">
                          <label className="text-sm font-medium text-slate-800">
                            Intent Name
                            <input
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                              onChange={(event) =>
                                updateIntent(intent.id, (current) => ({
                                  ...current,
                                  name: event.target.value,
                                }))
                              }
                              value={intent.name}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-800">
                            Description
                            <textarea
                              className="mt-2 h-20 w-full rounded-3xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                              onChange={(event) =>
                                updateIntent(intent.id, (current) => ({
                                  ...current,
                                  description: event.target.value,
                                }))
                              }
                              value={intent.description ?? ""}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-800">
                            Training Phrases
                            <textarea
                              className="mt-2 h-28 w-full rounded-3xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                              onChange={(event) =>
                                updateIntent(intent.id, (current) => ({
                                  ...current,
                                  sample_utterances: event.target.value
                                    .split("\n")
                                    .map((value) => value.trim())
                                    .filter(Boolean),
                                }))
                              }
                              value={intent.sample_utterances.join("\n")}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-800">
                            Response Template
                            <textarea
                              className="mt-2 h-24 w-full rounded-3xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                              onChange={(event) =>
                                updateIntent(intent.id, (current) => ({
                                  ...current,
                                  response_template: event.target.value,
                                }))
                              }
                              value={intent.response_template}
                            />
                          </label>
                          <label className="text-sm font-medium text-slate-800">
                            Priority
                            <input
                              className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                              onChange={(event) =>
                                updateIntent(intent.id, (current) => ({
                                  ...current,
                                  priority: Number(event.target.value) || 0,
                                }))
                              }
                              type="number"
                              value={intent.priority}
                            />
                          </label>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>

              <section className="surface-panel p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
                      Flow Builder
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                      Visual bot flow
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Map ordered steps, link nodes together, and associate
                      message paths to intents.
                    </p>
                  </div>
                  <button
                    className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8]"
                    onClick={addNode}
                    type="button"
                  >
                    <Plus className="h-4 w-4" />
                    Add Step
                  </button>
                </div>

                <div className="mt-6 overflow-x-auto">
                  <div className="flex min-w-max items-stretch gap-4 pb-2">
                    {draftBot.nodes.length === 0 ? (
                      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-8 py-14 text-center text-sm text-slate-500">
                        No flow steps yet. Add a node to design the conversation.
                      </div>
                    ) : (
                      draftBot.nodes
                        .slice()
                        .sort((left, right) => left.step_order - right.step_order)
                        .map((node, index, array) => (
                          <div key={node.id} className="flex items-center gap-4">
                            <article className="w-[320px] rounded-3xl border border-slate-100 bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#3182ce]">
                                    <Workflow className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                      Step {node.step_order}
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-950">
                                      {node.title}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                                  onClick={() => removeNode(node.id)}
                                  type="button"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              <div className="mt-5 grid gap-4">
                                <label className="text-sm font-medium text-slate-800">
                                  Node Key
                                  <input
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                                    onChange={(event) =>
                                      updateNode(node.id, (current) => ({
                                        ...current,
                                        node_key: event.target.value,
                                      }))
                                    }
                                    value={node.node_key}
                                  />
                                </label>
                                <label className="text-sm font-medium text-slate-800">
                                  Title
                                  <input
                                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                                    onChange={(event) =>
                                      updateNode(node.id, (current) => ({
                                        ...current,
                                        title: event.target.value,
                                      }))
                                    }
                                    value={node.title}
                                  />
                                </label>
                                <div className="grid gap-4 sm:grid-cols-2">
                                  <label className="text-sm font-medium text-slate-800">
                                    Node Type
                                    <select
                                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                                      onChange={(event) =>
                                        updateNode(node.id, (current) => ({
                                          ...current,
                                          node_type:
                                            event.target.value as ChatbotNodeRecord["node_type"],
                                        }))
                                      }
                                      value={node.node_type}
                                    >
                                      {chatbotNodeTypes.map((nodeType) => (
                                        <option key={nodeType} value={nodeType}>
                                          {nodeType}
                                        </option>
                                      ))}
                                    </select>
                                  </label>

                                  <label className="text-sm font-medium text-slate-800">
                                    Linked Intent
                                    <select
                                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                                      onChange={(event) =>
                                        updateNode(node.id, (current) => ({
                                          ...current,
                                          intent_id: event.target.value || null,
                                        }))
                                      }
                                      value={node.intent_id ?? ""}
                                    >
                                      <option value="">Global / fallback</option>
                                      {draftBot.intents.map((intent) => (
                                        <option key={intent.id} value={intent.id}>
                                          {intent.name}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>

                                <label className="text-sm font-medium text-slate-800">
                                  Content
                                  <textarea
                                    className="mt-2 h-28 w-full rounded-3xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                                    onChange={(event) =>
                                      updateNode(node.id, (current) => ({
                                        ...current,
                                        content: event.target.value,
                                      }))
                                    }
                                    value={node.content}
                                  />
                                </label>

                                <div className="grid gap-4 sm:grid-cols-2">
                                  <label className="text-sm font-medium text-slate-800">
                                    Next Node Key
                                    <input
                                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                                      onChange={(event) =>
                                        updateNode(node.id, (current) => ({
                                          ...current,
                                          next_node_key: event.target.value || null,
                                        }))
                                      }
                                      value={node.next_node_key ?? ""}
                                    />
                                  </label>
                                  <label className="text-sm font-medium text-slate-800">
                                    Step Order
                                    <input
                                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                                      onChange={(event) =>
                                        updateNode(node.id, (current) => ({
                                          ...current,
                                          step_order: Number(event.target.value) || 1,
                                        }))
                                      }
                                      type="number"
                                      value={node.step_order}
                                    />
                                  </label>
                                </div>
                              </div>
                            </article>
                            {index < array.length - 1 ? (
                              <div className="hidden items-center gap-2 text-slate-300 md:flex">
                                <div className="h-px w-10 bg-slate-200" />
                                <ArrowRight className="h-4 w-4" />
                              </div>
                            ) : null}
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
                <article className="surface-panel p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.2em] text-[#3182ce]">
                        NLP Test Console
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                        Run intent recognition
                      </h2>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        Test the current draft against the server-side intent
                        classifier before you publish it.
                      </p>
                    </div>
                    <button
                      className="inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isPending}
                      onClick={runIntentTest}
                      type="button"
                    >
                      <Play className="h-4 w-4" />
                      {isPending ? "Analyzing..." : "Analyze Utterance"}
                    </button>
                  </div>

                  <label className="mt-6 block text-sm font-medium text-slate-800">
                    Sample user message
                    <textarea
                      className="mt-2 h-28 w-full rounded-3xl border border-slate-200 bg-[#f8fbff] px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                      onChange={(event) => setTesterInput(event.target.value)}
                      value={testerInput}
                    />
                  </label>

                  {testerResult ? (
                    <div className="mt-6 grid gap-4">
                      <div className="surface-muted grid gap-3 px-4 py-4 text-sm text-slate-700 sm:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Detection Mode
                          </p>
                          <p className="mt-2 font-semibold text-slate-950">
                            {testerResult.mode === "model" ? "OpenAI" : "Heuristic"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Confidence
                          </p>
                          <p className="mt-2 font-semibold text-slate-950">
                            {(testerResult.confidence * 100).toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-slate-100 bg-white p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          Matched Intent
                        </p>
                        <p className="mt-2 text-xl font-semibold text-slate-950">
                          {testerResult.intent_name ?? "Fallback"}
                        </p>
                        <p className="mt-3 text-sm leading-7 text-slate-600">
                          {testerResult.rationale}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-slate-100 bg-white p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          Suggested Reply
                        </p>
                        <p className="mt-3 text-sm leading-7 text-slate-700">
                          {testerResult.suggested_reply}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </article>

                <article className="space-y-6">
                  <div className="surface-panel p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#3182ce]">
                        <Brain className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-950">
                          NLP evidence
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Training examples and flow steps selected by the latest test.
                        </p>
                      </div>
                    </div>

                    {testerResult ? (
                      <div className="mt-6 space-y-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Matched examples
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {testerResult.matched_examples.length === 0 ? (
                              <span className="text-sm text-slate-500">
                                No direct examples matched.
                              </span>
                            ) : (
                              testerResult.matched_examples.map((example) => (
                                <span
                                  key={example}
                                  className="accent-chip inline-flex rounded-full px-3 py-2 text-xs font-semibold"
                                >
                                  {example}
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                            Flow preview
                          </p>
                          <div className="mt-3 space-y-3">
                            {testerResult.flow_preview.map((step) => (
                              <div
                                key={step.node_key}
                                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4"
                              >
                                <div className="flex items-center justify-between gap-4">
                                  <p className="font-semibold text-slate-950">
                                    {step.title}
                                  </p>
                                  <span className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                    {step.node_type}
                                  </span>
                                </div>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                  {step.content}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-6 text-sm leading-7 text-slate-500">
                        Run the NLP test to inspect the matched examples and the
                        flow path that would be triggered for the current draft.
                      </p>
                    )}
                  </div>

                  <div className="surface-panel p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ebf5ff] text-[#3182ce]">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-slate-950">
                          Builder notes
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Recommended structure for the hackathon MVP.
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-3 text-sm text-slate-700">
                      <div className="surface-muted px-4 py-4">
                        Keep each intent focused on one outcome such as pricing,
                        delivery, or escalation.
                      </div>
                      <div className="surface-muted px-4 py-4">
                        Use a global fallback node plus intent-linked response
                        nodes so the flow stays readable.
                      </div>
                      <div className="surface-muted px-4 py-4">
                        Publish only after the NLP test consistently selects the
                        correct intent for your core examples.
                      </div>
                    </div>
                  </div>
                </article>
              </section>
            </>
          )}
        </div>
      </div>

      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
