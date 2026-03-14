import OpenAI from "openai";
import { NextResponse } from "next/server";
import { parseJsonObject } from "@/lib/openai";
import { authorizeRequest } from "@/lib/requestAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWebhookEvent } from "@/lib/webhooks";

type SentimentRequest = {
  message_id?: string;
  body?: string;
};

type SentimentResponse = {
  score: number;
  label: "Positive" | "Neutral" | "Negative";
};

export async function POST(request: Request) {
  const authorization = await authorizeRequest(request, { sessionOnly: true });

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as SentimentRequest;

  if (!payload.message_id || !payload.body) {
    return NextResponse.json(
      { error: "message_id and body are required." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 500 },
    );
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response = await openai.responses.create({
    model: "gpt-4o",
    input: [
      {
        role: "system",
        content:
          "Analyze sentiment. Return ONLY JSON: {\"score\": float between -1 and 1, \"label\": \"Positive\" or \"Neutral\" or \"Negative\"}",
      },
      {
        role: "user",
        content: payload.body,
      },
    ],
  });

  let parsed: SentimentResponse;

  try {
    parsed = parseJsonObject<SentimentResponse>(response.output_text);
  } catch {
    return NextResponse.json(
      { error: "OpenAI did not return valid JSON.", raw: response.output_text },
      { status: 502 },
    );
  }

  const normalizedLabel = parsed.label.toLowerCase();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("messages")
    .update({
      sentiment_score: parsed.score,
      sentiment_label: normalizedLabel,
    })
    .eq("id", payload.message_id)
    .eq("org_id", authorization.orgId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  void dispatchWebhookEvent(authorization.orgId, "sentiment.updated", {
    message_id: payload.message_id,
    score: parsed.score,
    label: parsed.label,
  });

  return NextResponse.json({
    score: parsed.score,
    label: parsed.label,
  });
}
