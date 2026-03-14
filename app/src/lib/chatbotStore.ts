import { randomUUID } from "node:crypto";
import OpenAI from "openai";
import {
  cloneChatbotGraph,
  isChatbotNodeType,
  isChatbotStatus,
  type ChatbotGraph,
  type ChatbotIntentRecord,
  type ChatbotNodeRecord,
  type ChatbotRecord,
} from "@/lib/chatbots";
import { parseJsonObject } from "@/lib/openai";
import { isMessagingChannel } from "@/lib/messaging";
import { createAdminClient } from "@/lib/supabase/admin";

type ChatbotRow = ChatbotRecord & {
  org_id: string;
};

type ChatbotIntentRow = ChatbotIntentRecord & {
  org_id: string;
  bot_id: string;
};

type ChatbotNodeRow = ChatbotNodeRecord & {
  org_id: string;
  bot_id: string;
};

type NlpMatch = {
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

function groupByBotId<T extends { bot_id: string }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((grouped, row) => {
    grouped[row.bot_id] ??= [];
    grouped[row.bot_id].push(row);
    return grouped;
  }, {});
}

function sanitizeIntent(input: Partial<ChatbotIntentRecord>) {
  const createdAt =
    typeof input.created_at === "string" && input.created_at.length > 0
      ? input.created_at
      : new Date().toISOString();

  return {
    id: typeof input.id === "string" && input.id.length > 0 ? input.id : randomUUID(),
    name:
      typeof input.name === "string" && input.name.trim().length > 0
        ? input.name.trim()
        : "new_intent",
    description:
      typeof input.description === "string" && input.description.trim().length > 0
        ? input.description.trim()
        : null,
    sample_utterances: Array.isArray(input.sample_utterances)
      ? input.sample_utterances
          .map((utterance) =>
            typeof utterance === "string" ? utterance.trim() : "",
          )
          .filter(Boolean)
      : [],
    response_template:
      typeof input.response_template === "string" &&
      input.response_template.trim().length > 0
        ? input.response_template.trim()
        : "Thanks for your message. I can help with that.",
    priority:
      typeof input.priority === "number" && Number.isFinite(input.priority)
        ? Math.max(0, Math.round(input.priority))
        : 0,
    created_at: createdAt,
    updated_at:
      typeof input.updated_at === "string" && input.updated_at.length > 0
        ? input.updated_at
        : createdAt,
  };
}

function sanitizeNode(
  input: {
    id?: string;
    intent_id?: string | null;
    node_key?: string;
    title?: string;
    node_type?: string;
    content?: string;
    next_node_key?: string | null;
    step_order?: number;
    position_x?: number;
    position_y?: number;
    metadata?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
  },
  order: number,
) {
  const createdAt =
    typeof input.created_at === "string" && input.created_at.length > 0
      ? input.created_at
      : new Date().toISOString();

  return {
    id: typeof input.id === "string" && input.id.length > 0 ? input.id : randomUUID(),
    intent_id: typeof input.intent_id === "string" && input.intent_id.length > 0
      ? input.intent_id
      : null,
    node_key:
      typeof input.node_key === "string" && input.node_key.trim().length > 0
        ? input.node_key.trim()
        : `node_${order + 1}`,
    title:
      typeof input.title === "string" && input.title.trim().length > 0
        ? input.title.trim()
        : `Step ${order + 1}`,
    node_type:
      typeof input.node_type === "string" && isChatbotNodeType(input.node_type)
        ? input.node_type
        : "message",
    content:
      typeof input.content === "string" && input.content.trim().length > 0
        ? input.content.trim()
        : "Update this step with the correct response content.",
    next_node_key:
      typeof input.next_node_key === "string" && input.next_node_key.trim().length > 0
        ? input.next_node_key.trim()
        : null,
    step_order:
      typeof input.step_order === "number" && Number.isFinite(input.step_order)
        ? Math.max(1, Math.round(input.step_order))
        : order + 1,
    position_x:
      typeof input.position_x === "number" && Number.isFinite(input.position_x)
        ? Math.round(input.position_x)
        : order * 240,
    position_y:
      typeof input.position_y === "number" && Number.isFinite(input.position_y)
        ? Math.round(input.position_y)
        : 0,
    metadata:
      input.metadata && typeof input.metadata === "object"
        ? input.metadata
        : {},
    created_at: createdAt,
    updated_at:
      typeof input.updated_at === "string" && input.updated_at.length > 0
        ? input.updated_at
        : createdAt,
  };
}

function normalizeTokenSet(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .map((token) => token.trim())
      .filter((token) => token.length > 2),
  );
}

function scoreUtteranceMatch(utterance: string, examples: string[]) {
  const utteranceTokens = normalizeTokenSet(utterance);
  if (utteranceTokens.size === 0) {
    return { score: 0, matchedExamples: [] as string[] };
  }

  let bestScore = 0;
  const matchedExamples: string[] = [];

  for (const example of examples) {
    const exampleTokens = normalizeTokenSet(example);
    if (exampleTokens.size === 0) {
      continue;
    }

    const sharedCount = [...utteranceTokens].filter((token) =>
      exampleTokens.has(token),
    ).length;
    const overlap = sharedCount / Math.max(exampleTokens.size, utteranceTokens.size);
    const substringBonus =
      utterance.toLowerCase().includes(example.toLowerCase()) ||
      example.toLowerCase().includes(utterance.toLowerCase())
        ? 0.2
        : 0;
    const score = overlap + substringBonus;

    if (score > 0) {
      matchedExamples.push(example);
    }

    if (score > bestScore) {
      bestScore = score;
    }
  }

  return {
    score: Math.min(1, bestScore),
    matchedExamples: matchedExamples.slice(0, 3),
  };
}

function buildFlowPreview(bot: ChatbotGraph, intentId: string | null) {
  const relevantNodes = bot.nodes
    .filter((node) => !intentId || node.intent_id === intentId || node.intent_id === null)
    .sort((left, right) => left.step_order - right.step_order)
    .slice(0, 4);

  return relevantNodes.map((node) => ({
    node_key: node.node_key,
    title: node.title,
    node_type: node.node_type,
    content: node.content,
  }));
}

function classifyHeuristically(bot: ChatbotGraph, utterance: string): NlpMatch {
  const ranked = bot.intents
    .map((intent) => {
      const { score, matchedExamples } = scoreUtteranceMatch(
        utterance,
        intent.sample_utterances,
      );
      return {
        intent,
        matchedExamples,
        score: Math.min(1, score + intent.priority / 1000),
      };
    })
    .sort((left, right) => right.score - left.score);

  const winner = ranked[0];

  if (!winner || winner.score < 0.14) {
    return {
      mode: "heuristic",
      intent_id: null,
      intent_name: null,
      confidence: 0,
      rationale:
        "No intent passed the confidence threshold, so the chatbot will use the fallback message.",
      suggested_reply: bot.fallback_message,
      matched_examples: [],
      flow_preview: buildFlowPreview(bot, null),
    };
  }

  return {
    mode: "heuristic",
    intent_id: winner.intent.id,
    intent_name: winner.intent.name,
    confidence: Number(winner.score.toFixed(2)),
    rationale:
      "Matched the strongest overlap between the user utterance and the intent training examples.",
    suggested_reply: winner.intent.response_template,
    matched_examples: winner.matchedExamples,
    flow_preview: buildFlowPreview(bot, winner.intent.id),
  };
}

async function classifyWithModel(bot: ChatbotGraph, utterance: string) {
  if (!process.env.OPENAI_API_KEY || bot.intents.length === 0) {
    return null;
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.responses.create({
    model: "gpt-4o-mini",
    input: [
      {
        role: "system",
        content:
          "You classify chatbot intents. Return only valid JSON with keys intent_id, confidence, rationale.",
      },
      {
        role: "user",
        content: JSON.stringify({
          utterance,
          intents: bot.intents.map((intent) => ({
            id: intent.id,
            name: intent.name,
            description: intent.description,
            sample_utterances: intent.sample_utterances,
            response_template: intent.response_template,
          })),
        }),
      },
    ],
  });

  const parsed = parseJsonObject<{
    intent_id?: string | null;
    confidence?: number;
    rationale?: string;
  }>(response.output_text);
  const intent =
    typeof parsed.intent_id === "string"
      ? bot.intents.find((candidate) => candidate.id === parsed.intent_id) ?? null
      : null;

  if (!intent) {
    return {
      mode: "model" as const,
      intent_id: null,
      intent_name: null,
      confidence:
        typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
          ? Math.max(0, Math.min(1, parsed.confidence))
          : 0,
      rationale:
        typeof parsed.rationale === "string" && parsed.rationale.trim().length > 0
          ? parsed.rationale.trim()
          : "The model did not select a confident intent, so the fallback response will be used.",
      suggested_reply: bot.fallback_message,
      matched_examples: [],
      flow_preview: buildFlowPreview(bot, null),
    };
  }

  return {
    mode: "model" as const,
    intent_id: intent.id,
    intent_name: intent.name,
    confidence:
      typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0.5,
    rationale:
      typeof parsed.rationale === "string" && parsed.rationale.trim().length > 0
        ? parsed.rationale.trim()
        : "The model selected the most relevant intent based on the training examples.",
    suggested_reply: intent.response_template,
    matched_examples: intent.sample_utterances.slice(0, 3),
    flow_preview: buildFlowPreview(bot, intent.id),
  };
}

export async function loadChatbotsForOrg(orgId: string): Promise<ChatbotGraph[]> {
  const admin = createAdminClient();
  const [{ data: bots, error: botError }, { data: intents, error: intentError }, { data: nodes, error: nodeError }] =
    await Promise.all([
      admin
        .from("chatbots")
        .select(
          "id, org_id, name, description, status, default_channel, welcome_message, fallback_message, created_at, updated_at",
        )
        .eq("org_id", orgId)
        .order("updated_at", { ascending: false }),
      admin
        .from("chatbot_intents")
        .select(
          "id, org_id, bot_id, name, description, sample_utterances, response_template, priority, created_at, updated_at",
        )
        .eq("org_id", orgId)
        .order("priority", { ascending: false }),
      admin
        .from("chatbot_nodes")
        .select(
          "id, org_id, bot_id, intent_id, node_key, title, node_type, content, next_node_key, step_order, position_x, position_y, metadata, created_at, updated_at",
        )
        .eq("org_id", orgId)
        .order("step_order", { ascending: true }),
    ]);

  if (botError) {
    throw new Error(botError.message);
  }

  if (intentError) {
    throw new Error(intentError.message);
  }

  if (nodeError) {
    throw new Error(nodeError.message);
  }

  const intentsByBot = groupByBotId((intents ?? []) as ChatbotIntentRow[]);
  const nodesByBot = groupByBotId((nodes ?? []) as ChatbotNodeRow[]);

  return ((bots ?? []) as ChatbotRow[]).map((bot) => ({
    id: bot.id,
    name: bot.name,
    description: bot.description,
    status: bot.status,
    default_channel: bot.default_channel,
    welcome_message: bot.welcome_message,
    fallback_message: bot.fallback_message,
    created_at: bot.created_at,
    updated_at: bot.updated_at,
    intents: (intentsByBot[bot.id] ?? []).map((intent) => ({
      id: intent.id,
      name: intent.name,
      description: intent.description,
      sample_utterances: intent.sample_utterances,
      response_template: intent.response_template,
      priority: intent.priority,
      created_at: intent.created_at,
      updated_at: intent.updated_at,
    })),
    nodes: (nodesByBot[bot.id] ?? []).map((node) => ({
      id: node.id,
      intent_id: node.intent_id,
      node_key: node.node_key,
      title: node.title,
      node_type: node.node_type,
      content: node.content,
      next_node_key: node.next_node_key,
      step_order: node.step_order,
      position_x: node.position_x,
      position_y: node.position_y,
      metadata: node.metadata,
      created_at: node.created_at,
      updated_at: node.updated_at,
    })),
  }));
}

export async function findChatbotForOrg(orgId: string, botId: string) {
  const bots = await loadChatbotsForOrg(orgId);
  return bots.find((bot) => bot.id === botId) ?? null;
}

export async function createStarterChatbot(orgId: string) {
  const admin = createAdminClient();
  const botId = randomUUID();
  const intentId = randomUUID();
  const fallbackId = randomUUID();
  const endId = randomUUID();
  const now = new Date().toISOString();

  const botRow = {
    id: botId,
    org_id: orgId,
    name: "New Automation Bot",
    description: "Draft chatbot for onboarding, support, or campaign follow-up.",
    status: "draft" as const,
    default_channel: "whatsapp" as const,
    welcome_message:
      "Hi, I am your ConversAI assistant. Ask me about onboarding, support, or campaign help.",
    fallback_message:
      "I did not catch that. Ask about onboarding, support, or a live agent.",
    created_at: now,
    updated_at: now,
  };

  const intentRow = {
    id: intentId,
    org_id: orgId,
    bot_id: botId,
    name: "onboarding_help",
    description: "Handles onboarding and setup questions.",
    sample_utterances: [
      "How do I get started?",
      "Help me set up my channel",
      "What should I do first?",
    ],
    response_template:
      "Start by connecting a channel, importing contacts, then launch a first campaign or workflow.",
    priority: 80,
    created_at: now,
    updated_at: now,
  };

  const nodes = [
    {
      id: randomUUID(),
      org_id: orgId,
      bot_id: botId,
      intent_id: null,
      node_key: "welcome",
      title: "Welcome",
      node_type: "message" as const,
      content: botRow.welcome_message,
      next_node_key: "onboarding_help",
      step_order: 1,
      position_x: 0,
      position_y: 0,
      metadata: {},
      created_at: now,
      updated_at: now,
    },
    {
      id: fallbackId,
      org_id: orgId,
      bot_id: botId,
      intent_id: intentId,
      node_key: "onboarding_help",
      title: "Onboarding Guidance",
      node_type: "question" as const,
      content:
        "Connect a channel, upload your contacts, then draft a campaign or optimize copy.",
      next_node_key: "end",
      step_order: 2,
      position_x: 240,
      position_y: 0,
      metadata: { intent: "onboarding_help" },
      created_at: now,
      updated_at: now,
    },
    {
      id: endId,
      org_id: orgId,
      bot_id: botId,
      intent_id: null,
      node_key: "end",
      title: "End",
      node_type: "end" as const,
      content: "You can ask another question whenever you need help.",
      next_node_key: null,
      step_order: 3,
      position_x: 480,
      position_y: 0,
      metadata: {},
      created_at: now,
      updated_at: now,
    },
  ];

  const { error: botError } = await admin.from("chatbots").insert(botRow);
  if (botError) {
    throw new Error(botError.message);
  }

  const { error: intentError } = await admin.from("chatbot_intents").insert(intentRow);
  if (intentError) {
    throw new Error(intentError.message);
  }

  const { error: nodeError } = await admin.from("chatbot_nodes").insert(nodes);
  if (nodeError) {
    throw new Error(nodeError.message);
  }

  const bot = await findChatbotForOrg(orgId, botId);
  if (!bot) {
    throw new Error("Created chatbot could not be loaded.");
  }

  return bot;
}

export async function saveChatbotConfiguration(
  orgId: string,
  payload: {
    id: string;
    name?: string;
    description?: string | null;
    status?: string;
    default_channel?: string | null;
    welcome_message?: string;
    fallback_message?: string;
    intents?: Array<{
      id?: string;
      name?: string;
      description?: string | null;
      sample_utterances?: string[];
      response_template?: string;
      priority?: number;
      created_at?: string;
      updated_at?: string;
    }>;
    nodes?: Array<{
      id?: string;
      intent_id?: string | null;
      node_key?: string;
      title?: string;
      node_type?: string;
      content?: string;
      next_node_key?: string | null;
      step_order?: number;
      position_x?: number;
      position_y?: number;
      metadata?: Record<string, unknown>;
      created_at?: string;
      updated_at?: string;
    }>;
  },
) {
  const admin = createAdminClient();
  const currentBot = await findChatbotForOrg(orgId, payload.id);

  if (!currentBot) {
    throw new Error("Chatbot not found.");
  }

  const status =
    typeof payload.status === "string" && isChatbotStatus(payload.status)
      ? payload.status
      : currentBot.status;
  const defaultChannel =
    typeof payload.default_channel === "string" &&
    isMessagingChannel(payload.default_channel)
      ? payload.default_channel
      : payload.default_channel === null
        ? null
        : currentBot.default_channel;

  const updatedAt = new Date().toISOString();

  const { error: updateBotError } = await admin
    .from("chatbots")
    .update({
      name:
        typeof payload.name === "string" && payload.name.trim().length > 0
          ? payload.name.trim()
          : currentBot.name,
      description:
        typeof payload.description === "string" && payload.description.trim().length > 0
          ? payload.description.trim()
          : payload.description === ""
            ? null
            : currentBot.description,
      status,
      default_channel: defaultChannel,
      welcome_message:
        typeof payload.welcome_message === "string" &&
        payload.welcome_message.trim().length > 0
          ? payload.welcome_message.trim()
          : currentBot.welcome_message,
      fallback_message:
        typeof payload.fallback_message === "string" &&
        payload.fallback_message.trim().length > 0
          ? payload.fallback_message.trim()
          : currentBot.fallback_message,
      updated_at: updatedAt,
    })
    .eq("id", payload.id)
    .eq("org_id", orgId);

  if (updateBotError) {
    throw new Error(updateBotError.message);
  }

  const intents = Array.isArray(payload.intents)
    ? payload.intents.map((intent) => sanitizeIntent(intent))
    : currentBot.intents.map((intent) => sanitizeIntent(intent));
  const nodes = Array.isArray(payload.nodes)
    ? payload.nodes.map((node, index) => sanitizeNode(node, index))
    : currentBot.nodes.map((node, index) => sanitizeNode(node, index));

  const { error: deleteNodesError } = await admin
    .from("chatbot_nodes")
    .delete()
    .eq("org_id", orgId)
    .eq("bot_id", payload.id);

  if (deleteNodesError) {
    throw new Error(deleteNodesError.message);
  }

  const { error: deleteIntentsError } = await admin
    .from("chatbot_intents")
    .delete()
    .eq("org_id", orgId)
    .eq("bot_id", payload.id);

  if (deleteIntentsError) {
    throw new Error(deleteIntentsError.message);
  }

  if (intents.length > 0) {
    const { error: insertIntentsError } = await admin.from("chatbot_intents").insert(
      intents.map((intent) => ({
        id: intent.id,
        org_id: orgId,
        bot_id: payload.id,
        name: intent.name,
        description: intent.description,
        sample_utterances: intent.sample_utterances,
        response_template: intent.response_template,
        priority: intent.priority,
        created_at: intent.created_at || updatedAt,
        updated_at: updatedAt,
      })),
    );

    if (insertIntentsError) {
      throw new Error(insertIntentsError.message);
    }
  }

  if (nodes.length > 0) {
    const validIntentIds = new Set(intents.map((intent) => intent.id));
    const { error: insertNodesError } = await admin.from("chatbot_nodes").insert(
      nodes.map((node) => ({
        id: node.id,
        org_id: orgId,
        bot_id: payload.id,
        intent_id: node.intent_id && validIntentIds.has(node.intent_id) ? node.intent_id : null,
        node_key: node.node_key,
        title: node.title,
        node_type: node.node_type,
        content: node.content,
        next_node_key: node.next_node_key,
        step_order: node.step_order,
        position_x: node.position_x,
        position_y: node.position_y,
        metadata: node.metadata,
        created_at: node.created_at || updatedAt,
        updated_at: updatedAt,
      })),
    );

    if (insertNodesError) {
      throw new Error(insertNodesError.message);
    }
  }

  const bot = await findChatbotForOrg(orgId, payload.id);
  if (!bot) {
    throw new Error("Saved chatbot could not be loaded.");
  }

  return cloneChatbotGraph(bot);
}

export async function classifyChatbotIntent(
  bot: ChatbotGraph,
  utterance: string,
): Promise<NlpMatch> {
  try {
    const modelResult = await classifyWithModel(bot, utterance);
    if (modelResult) {
      return modelResult;
    }
  } catch {
    // Fall back to the local classifier when the model is unavailable or invalid.
  }

  return classifyHeuristically(bot, utterance);
}
