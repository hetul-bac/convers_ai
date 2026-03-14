import { NextResponse } from "next/server";
import {
  createStarterChatbot,
  loadChatbotsForOrg,
  saveChatbotConfiguration,
} from "@/lib/chatbotStore";
import { withUsageLogging } from "@/lib/logUsage";
import { authorizeRequest } from "@/lib/requestAuth";

type SaveBotRequest = {
  id?: string;
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
  }>;
};

export const GET = withUsageLogging(async (request: Request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bots = await loadChatbotsForOrg(authorization.orgId);
    return NextResponse.json(bots);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load chatbots." },
      { status: 500 },
    );
  }
});

export const POST = withUsageLogging(async (request: Request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const bot = await createStarterChatbot(authorization.orgId);
    return NextResponse.json(bot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create chatbot." },
      { status: 500 },
    );
  }
});

export const PUT = withUsageLogging(async (request: Request) => {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as SaveBotRequest;

  if (!payload.id) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  try {
    const bot = await saveChatbotConfiguration(authorization.orgId, {
      id: payload.id,
      name: payload.name,
      description: payload.description ?? undefined,
      status: payload.status,
      default_channel: payload.default_channel ?? undefined,
      welcome_message: payload.welcome_message,
      fallback_message: payload.fallback_message,
      intents: payload.intents,
      nodes: payload.nodes,
    });

    return NextResponse.json(bot);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save chatbot." },
      { status: 500 },
    );
  }
});
