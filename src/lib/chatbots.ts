import type { MessagingChannel } from "@/lib/messaging";

export const chatbotStatuses = ["draft", "published"] as const;
export const chatbotNodeTypes = [
  "message",
  "question",
  "choice",
  "handoff",
  "end",
] as const;

export type ChatbotStatus = (typeof chatbotStatuses)[number];
export type ChatbotNodeType = (typeof chatbotNodeTypes)[number];

export type ChatbotRecord = {
  id: string;
  name: string;
  description: string | null;
  status: ChatbotStatus;
  default_channel: MessagingChannel | null;
  welcome_message: string;
  fallback_message: string;
  created_at: string;
  updated_at: string;
};

export type ChatbotIntentRecord = {
  id: string;
  name: string;
  description: string | null;
  sample_utterances: string[];
  response_template: string;
  priority: number;
  created_at: string;
  updated_at: string;
};

export type ChatbotNodeRecord = {
  id: string;
  intent_id: string | null;
  node_key: string;
  title: string;
  node_type: ChatbotNodeType;
  content: string;
  next_node_key: string | null;
  step_order: number;
  position_x: number;
  position_y: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ChatbotGraph = ChatbotRecord & {
  intents: ChatbotIntentRecord[];
  nodes: ChatbotNodeRecord[];
};

export function isChatbotStatus(value: string): value is ChatbotStatus {
  return chatbotStatuses.includes(value as ChatbotStatus);
}

export function isChatbotNodeType(value: string): value is ChatbotNodeType {
  return chatbotNodeTypes.includes(value as ChatbotNodeType);
}

export function cloneChatbotGraph(bot: ChatbotGraph) {
  return JSON.parse(JSON.stringify(bot)) as ChatbotGraph;
}
