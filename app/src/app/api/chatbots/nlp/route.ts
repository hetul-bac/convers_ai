import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  classifyChatbotIntent,
  findChatbotForOrg,
} from "@/lib/chatbotStore";
import {
  isChatbotNodeType,
  isChatbotStatus,
  type ChatbotGraph,
} from "@/lib/chatbots";
import { withUsageLogging } from "@/lib/logUsage";
import { authorizeRequest } from "@/lib/requestAuth";
import { isMessagingChannel } from "@/lib/messaging";

type ChatbotDraftPayload = Partial<ChatbotGraph>;

type NlpRequest = {
  utterance?: string;
  bot_id?: string;
  bot?: ChatbotDraftPayload;
};

function normalizeDraftBot(input: ChatbotDraftPayload): ChatbotGraph {
  const timestamp = new Date().toISOString();

  return {
    id: typeof input.id === "string" ? input.id : randomUUID(),
    name:
      typeof input.name === "string" && input.name.trim().length > 0
        ? input.name.trim()
        : "Draft Bot",
    description:
      typeof input.description === "string" && input.description.trim().length > 0
        ? input.description.trim()
        : null,
    status:
      typeof input.status === "string" && isChatbotStatus(input.status)
        ? input.status
        : "draft",
    default_channel:
      typeof input.default_channel === "string" &&
      isMessagingChannel(input.default_channel)
        ? input.default_channel
        : null,
    welcome_message:
      typeof input.welcome_message === "string" && input.welcome_message.trim().length > 0
        ? input.welcome_message.trim()
        : "Hi, how can I help?",
    fallback_message:
      typeof input.fallback_message === "string" && input.fallback_message.trim().length > 0
        ? input.fallback_message.trim()
        : "I did not catch that. Please rephrase your request.",
    created_at:
      typeof input.created_at === "string" && input.created_at.length > 0
        ? input.created_at
        : timestamp,
    updated_at: timestamp,
    intents: Array.isArray(input.intents)
      ? input.intents.map((intent, index) => ({
          id: typeof intent.id === "string" ? intent.id : randomUUID(),
          name:
            typeof intent.name === "string" && intent.name.trim().length > 0
              ? intent.name.trim()
              : `intent_${index + 1}`,
          description:
            typeof intent.description === "string" &&
            intent.description.trim().length > 0
              ? intent.description.trim()
              : null,
          sample_utterances: Array.isArray(intent.sample_utterances)
            ? intent.sample_utterances
                .map((sample) => (typeof sample === "string" ? sample.trim() : ""))
                .filter(Boolean)
            : [],
          response_template:
            typeof intent.response_template === "string" &&
            intent.response_template.trim().length > 0
              ? intent.response_template.trim()
              : "Thanks for your message.",
          priority:
            typeof intent.priority === "number" && Number.isFinite(intent.priority)
              ? Math.max(0, Math.round(intent.priority))
              : 0,
          created_at: timestamp,
          updated_at: timestamp,
        }))
      : [],
    nodes: Array.isArray(input.nodes)
      ? input.nodes.map((node, index) => ({
          id: typeof node.id === "string" ? node.id : randomUUID(),
          intent_id:
            typeof node.intent_id === "string" && node.intent_id.length > 0
              ? node.intent_id
              : null,
          node_key:
            typeof node.node_key === "string" && node.node_key.trim().length > 0
              ? node.node_key.trim()
              : `node_${index + 1}`,
          title:
            typeof node.title === "string" && node.title.trim().length > 0
              ? node.title.trim()
              : `Step ${index + 1}`,
          node_type:
            typeof node.node_type === "string" && isChatbotNodeType(node.node_type)
              ? node.node_type
              : "message",
          content:
            typeof node.content === "string" && node.content.trim().length > 0
              ? node.content.trim()
              : "Update this step.",
          next_node_key:
            typeof node.next_node_key === "string" && node.next_node_key.trim().length > 0
              ? node.next_node_key.trim()
              : null,
          step_order:
            typeof node.step_order === "number" && Number.isFinite(node.step_order)
              ? Math.max(1, Math.round(node.step_order))
              : index + 1,
          position_x:
            typeof node.position_x === "number" && Number.isFinite(node.position_x)
              ? Math.round(node.position_x)
              : index * 240,
          position_y:
            typeof node.position_y === "number" && Number.isFinite(node.position_y)
              ? Math.round(node.position_y)
              : 0,
          metadata:
            node.metadata && typeof node.metadata === "object"
              ? node.metadata
              : {},
          created_at: timestamp,
          updated_at: timestamp,
        }))
      : [],
  };
}

export const POST = withUsageLogging(async (request: Request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as NlpRequest;
  const utterance = payload.utterance?.trim();

  if (!utterance) {
    return NextResponse.json({ error: "utterance is required." }, { status: 400 });
  }

  let bot: ChatbotGraph | null = null;

  if (payload.bot && typeof payload.bot === "object") {
    bot = normalizeDraftBot(payload.bot);
  } else if (payload.bot_id) {
    bot = await findChatbotForOrg(authorization.orgId, payload.bot_id);
  }

  if (!bot) {
    return NextResponse.json(
      { error: "Provide bot_id or a chatbot draft." },
      { status: 400 },
    );
  }

  const result = await classifyChatbotIntent(bot, utterance);
  return NextResponse.json(result);
});
