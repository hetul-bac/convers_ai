import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getRequestContextOrgId, runWithRequestContext } from "@/lib/requestContext";
import { createAdminClient } from "@/lib/supabase/admin";

type LoggedRouteResult = {
  response: Response;
  orgId?: string | null;
};

type LoggedRouteHandler = (request: Request) => Promise<LoggedRouteResult | Response>;

type UsageLogInput = {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  orgId?: string | null;
};

function resolveEndpoint(request: Request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return request.url;
  }
}

export async function insertUsageLog({
  endpoint,
  method,
  statusCode,
  responseTimeMs,
  orgId,
}: UsageLogInput) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("usage_logs").insert({
      id: randomUUID(),
      org_id: orgId ?? null,
      endpoint,
      method,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
    });

    if (error) {
      console.error("Failed to insert usage log.", error.message);
    }
  } catch (error) {
    console.error(
      "Failed to create usage log client.",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

export function withUsageLogging(handler: LoggedRouteHandler) {
  return async function loggedHandler(request: Request) {
    const startedAt = Date.now();
    let orgId: string | null = null;
    let response: Response = NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );

    await runWithRequestContext(async () => {
      try {
        const result = await handler(request);

        if ("response" in result) {
          orgId = result.orgId ?? getRequestContextOrgId();
          response = result.response;
          return;
        }

        orgId = getRequestContextOrgId();
        response = result;
      } catch (error) {
        response = NextResponse.json(
          {
            error:
              error instanceof Error ? error.message : "Internal server error.",
          },
          { status: 500 },
        );
        orgId = getRequestContextOrgId();
      }
    });

    await insertUsageLog({
      endpoint: resolveEndpoint(request),
      method: request.method.toUpperCase(),
      statusCode: response.status,
      responseTimeMs: Math.max(0, Date.now() - startedAt),
      orgId,
    });

    return response;
  };
}
