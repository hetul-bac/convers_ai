"use client";

import { useState } from "react";
import {
  BookOpen,
  KeyRound,
  LayoutTemplate,
  PlayCircle,
  ShieldCheck,
} from "lucide-react";

type EndpointDoc = {
  id: string;
  method: "GET" | "POST";
  path: string;
  description: string;
  requestExample: string | null;
  responseExample: string;
};

const endpointDocs: EndpointDoc[] = [
  {
    id: "messages",
    method: "POST",
    path: "/api/messages",
    description: "Send a simulated multi-channel message and record analytics + webhook events.",
    requestExample: `{
  "to": "+14155550101",
  "body": "Your order has shipped.",
  "channel": "sms"
}`,
    responseExample: `{
  "id": "b7d92e4d-c237-4c11-900c-5f0f95fef3e0",
  "status": "delivered",
  "cost": 0.0075,
  "channel": "sms",
  "timestamp": "2026-03-14T10:11:32.198Z",
  "connector_provider": "conversai_sandbox",
  "delivery_mode": "sandbox"
}`,
  },
  {
    id: "optimize",
    method: "POST",
    path: "/api/optimize",
    description: "Generate channel-specific variants from one source message using OpenAI.",
    requestExample: `{
  "message": "Join us this weekend for our spring launch event.",
  "channels": ["sms", "whatsapp", "rcs"]
}`,
    responseExample: `{
  "sms": "Spring launch this weekend. Save your seat now.",
  "whatsapp": "We're live this weekend 🎉 Tap in and join the spring launch.",
  "rcs": "Join our spring launch with rich updates, offers, and RSVP links."
}`,
  },
  {
    id: "sentiment",
    method: "POST",
    path: "/api/sentiment",
    description: "Analyze message sentiment and persist the normalized score back to the message record.",
    requestExample: `{
  "message_id": "30000000-0000-4000-8000-000000000001",
  "body": "This delivery was late and frustrating."
}`,
    responseExample: `{
  "score": -0.62,
  "label": "Negative"
}`,
  },
  {
    id: "verify-send",
    method: "POST",
    path: "/api/verify/send",
    description: "Generate a 6-digit OTP, store it in the verifications table, and simulate delivery over SMS, WhatsApp, or voice.",
    requestExample: `{
  "to": "+919876543210",
  "channel": "voice"
}`,
    responseExample: `{
  "verification_id": "82000000-0000-4000-8000-000000000003",
  "expires_in": 600
}`,
  },
  {
    id: "verify-check",
    method: "POST",
    path: "/api/verify/check",
    description: "Validate a submitted OTP against the stored verification and expiry window.",
    requestExample: `{
  "verification_id": "82000000-0000-4000-8000-000000000003",
  "code": "204118"
}`,
    responseExample: `{
  "valid": true
}`,
  },
  {
    id: "voice-call",
    method: "POST",
    path: "/api/voice/call",
    description: "Bonus blueprint route: queue a simulated voice call for standalone calling demos.",
    requestExample: `{
  "to": "+14155550101",
  "message": "This is a simulated voice call from ConversAI."
}`,
    responseExample: `{
  "call_id": "0f12c8b2-e704-4138-bdf8-b0f538591c05",
  "status": "queued",
  "channel": "voice",
  "to": "+14155550101",
  "estimated_duration_seconds": 36,
  "timestamp": "2026-03-14T10:52:18.472Z"
}`,
  },
  {
    id: "lookup",
    method: "GET",
    path: "/api/lookup?phone=%2B919876543210",
    description: "Resolve a phone number with simulated country, carrier, validity, and line-type data.",
    requestExample: null,
    responseExample: `{
  "phone": "+919876543210",
  "country": "India",
  "country_code": "IN",
  "carrier": "Jio",
  "is_valid": true,
  "line_type": "mobile",
  "flag": "🇮🇳"
}`,
  },
  {
    id: "numbers-get",
    method: "GET",
    path: "/api/numbers",
    description: "List provisioned phone numbers for the active organization.",
    requestExample: null,
    responseExample: `[
  {
    "id": "80000000-0000-4000-8000-000000000003",
    "number": "+919876543210",
    "country_code": "IN",
    "carrier": "Jio",
    "is_verified": true,
    "is_active": true,
    "created_at": "2026-02-14T11:40:00.000Z",
    "country": "India",
    "flag": "🇮🇳"
  }
]`,
  },
  {
    id: "numbers-post",
    method: "POST",
    path: "/api/numbers",
    description: "Provision a simulated local phone number for a supported market.",
    requestExample: `{
  "country_code": "SG"
}`,
    responseExample: `{
  "id": "d2c3c88d-7c39-4fd6-8017-fde73bf5882e",
  "number": "+6593487654",
  "country_code": "SG",
  "carrier": "Singtel",
  "is_verified": false,
  "is_active": true,
  "created_at": "2026-03-14T10:44:12.413Z",
  "country": "Singapore",
  "flag": "🇸🇬"
}`,
  },
  {
    id: "templates",
    method: "GET",
    path: "/api/templates",
    description: "Return all saved templates for the active organization.",
    requestExample: null,
    responseExample: `[
  {
    "id": "83000000-0000-4000-8000-000000000006",
    "name": "Whatsapp Welcome Flow",
    "body": "Hi {first_name}, welcome to ConversAI. Your workspace is ready to launch.",
    "channel": "whatsapp",
    "variables": ["first_name"],
    "is_approved": true,
    "created_at": "2026-02-18T11:00:00.000Z"
  }
]`,
  },
  {
    id: "analytics",
    method: "GET",
    path: "/api/analytics?from=2026-02-01&to=2026-03-14&channel=sms",
    description: "Fetch analytics rows by date range and optional channel, with an aggregate summary payload.",
    requestExample: null,
    responseExample: `{
  "rows": [
    {
      "date": "2026-03-14",
      "channel": "sms",
      "sent": 178,
      "delivered": 162,
      "failed": 8,
      "cost": 2.492,
      "engagement_rate": 0.91
    }
  ],
  "summary": {
    "total_sent": 178,
    "total_delivered": 162,
    "total_cost": 2.492,
    "avg_engagement": 0.91
  }
}`,
  },
  {
    id: "health",
    method: "GET",
    path: "/api/health",
    description: "Public health probe for uptime dashboards and external monitoring.",
    requestExample: null,
    responseExample: `{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2026-03-14T10:48:03.845Z"
}`,
  },
];

const codeExamples = {
  javascript: `const baseUrl = "https://your-app.vercel.app/api";

const response = await fetch(\`\${baseUrl}/verify/send\`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.CONVERSAI_API_KEY!,
  },
  body: JSON.stringify({
    to: "+919876543210",
    channel: "sms",
  }),
});

const verification = await response.json();
console.log(verification);`,
  python: `import os
import requests

base_url = "https://your-app.vercel.app/api"

response = requests.get(
    f"{base_url}/analytics",
    headers={"x-api-key": os.environ["CONVERSAI_API_KEY"]},
    params={"from": "2026-02-01", "to": "2026-03-14", "channel": "sms"},
    timeout=30,
)

print(response.json())`,
  curl: `curl -X POST "https://your-app.vercel.app/api/messages" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: $CONVERSAI_API_KEY" \\
  -d '{
    "to": "+14155550101",
    "body": "Launch update: your segment is live.",
    "channel": "sms"
  }'`,
} as const;

const exampleTabOptions = [
  { value: "javascript", label: "JavaScript/Node.js" },
  { value: "python", label: "Python" },
  { value: "curl", label: "cURL" },
] as const;

function getTokenClassName(token: string) {
  if (/^"(?:\\.|[^"])*"$/.test(token)) {
    return "text-[#a7f3d0]";
  }

  if (/^(true|false|null)$/.test(token)) {
    return "text-[#f9a8d4]";
  }

  if (/^\d+(?:\.\d+)?$/.test(token)) {
    return "text-[#fbbf24]";
  }

  if (
    /^(const|await|fetch|method|headers|body|import|from|timeout|print|requests|response)$/.test(
      token,
    )
  ) {
    return "text-[#c4b5fd]";
  }

  return "text-slate-100";
}

function renderHighlightedCode(code: string) {
  const tokens =
    code.match(
      /"(?:\\.|[^"])*"|\b(?:true|false|null|const|await|fetch|method|headers|body|import|from|timeout|print|requests|response)\b|\b\d+(?:\.\d+)?\b|\s+|[^\s]+/g,
    ) ?? [];

  return tokens.map((token, index) => {
    if (/^\s+$/.test(token)) {
      return <span key={`${token}-${index}`}>{token}</span>;
    }

    return (
      <span key={`${token}-${index}`} className={getTokenClassName(token)}>
        {token}
      </span>
    );
  });
}

function MethodBadge({ method }: { method: EndpointDoc["method"] }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
        method === "POST"
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-sky-500/15 text-sky-300"
      }`}
    >
      {method}
    </span>
  );
}

function CodeBlock({
  code,
  title,
}: {
  code: string;
  title: string;
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#08111f]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400">
        <span>{title}</span>
        <span>syntax-highlighted</span>
      </div>
      <pre className="overflow-x-auto px-4 py-4 text-sm leading-7">
        <code className="whitespace-pre-wrap">{renderHighlightedCode(code)}</code>
      </pre>
    </div>
  );
}

export function ApiDocsWorkspace() {
  const [activeExampleTab, setActiveExampleTab] =
    useState<(typeof exampleTabOptions)[number]["value"]>("javascript");

  return (
    <div className="min-h-screen bg-[#050814] text-slate-100">
      <div className="mx-auto grid w-full max-w-[1500px] gap-10 px-6 py-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-10">
        <aside className="lg:sticky lg:top-8 lg:self-start">
          <div className="rounded-[32px] border border-white/10 bg-white/5 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-cyan-400/10 text-cyan-300">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">API Docs</p>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Public reference
                </p>
              </div>
            </div>

            <nav className="mt-8 space-y-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Sections
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  <a className="block rounded-2xl px-3 py-2 hover:bg-white/5 hover:text-white" href="#getting-started">
                    Getting Started
                  </a>
                  <a className="block rounded-2xl px-3 py-2 hover:bg-white/5 hover:text-white" href="#endpoints">
                    Endpoints
                  </a>
                  <a className="block rounded-2xl px-3 py-2 hover:bg-white/5 hover:text-white" href="#code-examples">
                    Code Examples
                  </a>
                </div>
              </div>

              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Endpoints
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  {endpointDocs.map((endpoint) => (
                    <a
                      key={endpoint.id}
                      className="block rounded-2xl px-3 py-2 hover:bg-white/5 hover:text-white"
                      href={`#endpoint-${endpoint.id}`}
                    >
                      {endpoint.method} {endpoint.path}
                    </a>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </aside>

        <main className="space-y-10">
          <section className="overflow-hidden rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_top_left,#0ea5e933_0%,transparent_35%),radial-gradient(circle_at_bottom_right,#22c55e22_0%,transparent_30%),linear-gradient(180deg,#0c1425_0%,#060b16_100%)] p-8" id="getting-started">
            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
              <div>
                <span className="inline-flex rounded-full bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
                  Developer Experience
                </span>
                <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  ConversAI API documentation for messaging, verification, lookup, and analytics.
                </h1>
                <p className="mt-6 max-w-3xl text-base leading-8 text-slate-300">
                  Build on the hackathon MVP with the same primitives used in the dashboard:
                  API keys, OTP verification, phone lookup, number provisioning, templates,
                  analytics, and health checks.
                </p>

                <div className="mt-8 grid gap-4 md:grid-cols-3">
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Base URL
                    </p>
                    <p className="mt-3 font-mono text-sm text-white">
                      https://your-app.vercel.app/api
                    </p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Auth
                    </p>
                    <p className="mt-3 font-mono text-sm text-white">x-api-key</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      Formats
                    </p>
                    <p className="mt-3 text-sm text-white">JSON requests + responses</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="rounded-[32px] border border-white/10 bg-white/5 p-5">
                  <div className="flex items-center gap-3">
                    <KeyRound className="h-5 w-5 text-cyan-300" />
                    <h2 className="text-lg font-semibold text-white">How to get an API key</h2>
                  </div>
                  <ol className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                    <li>1. Sign in to the workspace.</li>
                    <li>2. Open Settings → API Keys.</li>
                    <li>3. Generate a key and copy it once.</li>
                    <li>4. Send it as the `x-api-key` header.</li>
                  </ol>
                </div>

                <div className="rounded-[32px] border border-dashed border-white/15 bg-[#09111d] p-5">
                  <div className="flex items-center gap-3">
                    <LayoutTemplate className="h-5 w-5 text-sky-300" />
                    <p className="text-sm font-semibold text-white">
                      Screenshot placeholder
                    </p>
                  </div>
                  <div className="mt-5 flex h-56 items-center justify-center rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#111827_55%,#0b1220_100%)]">
                    <div className="text-center">
                      <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
                        API Keys UI
                      </p>
                      <p className="mt-3 text-sm text-slate-300">
                        Replace with a product screenshot before launch.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6" id="endpoints">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">
                Endpoints
              </p>
              <h2 className="mt-3 text-3xl font-semibold text-white">
                Core API reference
              </h2>
            </div>

            <div className="space-y-6">
              {endpointDocs.map((endpoint) => (
                <article
                  key={endpoint.id}
                  className="rounded-[32px] border border-white/10 bg-white/5 p-6"
                  id={`endpoint-${endpoint.id}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <MethodBadge method={endpoint.method} />
                        <span className="font-mono text-sm text-slate-200">
                          {endpoint.path}
                        </span>
                      </div>
                      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
                        {endpoint.description}
                      </p>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                      {endpoint.method === "GET" ? "Read" : "Write"} endpoint
                    </div>
                  </div>

                  <div className={`mt-6 grid gap-4 ${endpoint.requestExample ? "xl:grid-cols-2" : ""}`}>
                    {endpoint.requestExample ? (
                      <CodeBlock code={endpoint.requestExample} title="Request body" />
                    ) : null}
                    <CodeBlock code={endpoint.responseExample} title="Response example" />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/10 bg-white/5 p-6" id="code-examples">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">
                  Code Examples
                </p>
                <h2 className="mt-3 text-3xl font-semibold text-white">
                  Copy-paste starter snippets
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {exampleTabOptions.map((option) => {
                  const active = activeExampleTab === option.value;

                  return (
                    <button
                      key={option.value}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? "bg-cyan-400 text-slate-950"
                          : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                      }`}
                      onClick={() => setActiveExampleTab(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
              <CodeBlock
                code={codeExamples[activeExampleTab]}
                title={exampleTabOptions.find((option) => option.value === activeExampleTab)?.label ?? "Example"}
              />

              <div className="space-y-4">
                <div className="rounded-[28px] border border-white/10 bg-[#08111f] p-5">
                  <div className="flex items-center gap-3">
                    <PlayCircle className="h-5 w-5 text-cyan-300" />
                    <p className="text-sm font-semibold text-white">Best practices</p>
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
                    <li>Use an API key for server-to-server reads and sends.</li>
                    <li>Store verification IDs client-side only until the OTP completes.</li>
                    <li>Poll `/api/health` from uptime tooling, not from user sessions.</li>
                  </ul>
                </div>
                <div className="rounded-[28px] border border-white/10 bg-[#08111f] p-5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-300" />
                    <p className="text-sm font-semibold text-white">Auth reminder</p>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    Most endpoints support session auth inside the dashboard and API key
                    auth for direct integration. `/api/health` is public by design.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
