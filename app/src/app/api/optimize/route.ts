import OpenAI from "openai";
import { NextResponse } from "next/server";
import { parseJsonObject } from "@/lib/openai";
import { authorizeRequest } from "@/lib/requestAuth";

type OptimizeRequest = {
  message?: string;
  channels?: string[];
};

function stringifyOptimizationValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => stringifyOptimizationValue(item))
      .filter(Boolean)
      .join("\n");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const parts = [
      record.title,
      record.body,
      Array.isArray(record.suggestions)
        ? record.suggestions.map((item) => `- ${stringifyOptimizationValue(item)}`).join("\n")
        : undefined,
    ]
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join("\n\n");
    }

    return JSON.stringify(value, null, 2);
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export async function POST(request: Request) {
  const authorization = await authorizeRequest(request);

  if (!authorization) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as OptimizeRequest;

  if (!payload.message || !payload.channels?.length) {
    return NextResponse.json(
      { error: "message and channels are required." },
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
          "You are a messaging expert. Return ONLY valid JSON, no markdown, no explanation.",
      },
      {
        role: "user",
        content: `Optimize this message for each channel: ${JSON.stringify(payload.channels)}. Rules: SMS under 160 chars, WhatsApp use emoji, RCS can be rich. Message: ${payload.message}. Return JSON with channel names as keys.`,
      },
    ],
  });

  try {
    const parsed = parseJsonObject<Record<string, unknown>>(response.output_text);
    const normalized = Object.fromEntries(
      Object.entries(parsed).map(([channel, value]) => [
        channel,
        stringifyOptimizationValue(value),
      ]),
    );

    return NextResponse.json(normalized);
  } catch {
    return NextResponse.json(
      { error: "OpenAI did not return valid JSON.", raw: response.output_text },
      { status: 502 },
    );
  }
}
