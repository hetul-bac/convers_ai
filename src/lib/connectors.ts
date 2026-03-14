import type { MessagingChannel } from "@/lib/messaging";

export const connectorStatuses = [
  "draft",
  "configured",
  "connected",
  "error",
] as const;

export const connectorTransportModes = ["sandbox", "simulated"] as const;

export const connectorProviders = [
  "conversai_sandbox",
  "sinch_sms",
  "whatsapp_cloud",
  "google_rcs",
  "telegram_bot",
  "viber_bot",
] as const;

export type ConnectorStatus = (typeof connectorStatuses)[number];
export type ConnectorTransportMode = (typeof connectorTransportModes)[number];
export type ConnectorProvider = (typeof connectorProviders)[number];

export type ConnectorCredentialField = {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
  description: string;
};

export type ConnectorDefinition = {
  provider: ConnectorProvider;
  label: string;
  description: string;
  channels: MessagingChannel[];
  fields: ConnectorCredentialField[];
  mode: ConnectorTransportMode;
};

export type ConnectorRow = {
  id: string;
  org_id?: string;
  channel: MessagingChannel;
  name: string;
  provider: ConnectorProvider;
  transport_mode: ConnectorTransportMode;
  status: ConnectorStatus;
  config: Record<string, unknown>;
  error_message: string | null;
  last_tested_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ConnectorView = Omit<ConnectorRow, "config"> & {
  provider_label: string;
  config_summary: Record<string, string>;
};

export const demoSandboxCredentials = {
  workspace_id: "demo-conversai-workspace",
  app_key: "demo-conversai-key",
  app_secret: "demo-conversai-secret",
} as const;

export const connectorCatalog: ConnectorDefinition[] = [
  {
    provider: "conversai_sandbox",
    label: "ConversAI Sandbox",
    description:
      "Test any supported channel with demo credentials. Delivery stays simulated inside the app.",
    channels: ["sms", "whatsapp", "rcs", "telegram", "viber"],
    mode: "sandbox",
    fields: [
      {
        key: "workspace_id",
        label: "Workspace ID",
        placeholder: "demo-conversai-workspace",
        description: "Sandbox workspace identifier.",
      },
      {
        key: "app_key",
        label: "App Key",
        placeholder: "demo-conversai-key",
        description: "Sandbox app key used for local validation.",
      },
      {
        key: "app_secret",
        label: "App Secret",
        placeholder: "demo-conversai-secret",
        secret: true,
        description: "Sandbox secret used for local validation.",
      },
    ],
  },
  {
    provider: "sinch_sms",
    label: "Sinch SMS",
    description:
      "Bring your own Sinch SMS credentials. This MVP validates shape only and simulates delivery.",
    channels: ["sms"],
    mode: "simulated",
    fields: [
      {
        key: "service_plan_id",
        label: "Service Plan ID",
        placeholder: "service-plan-id",
        description: "Sinch service plan identifier.",
      },
      {
        key: "api_token",
        label: "API Token",
        placeholder: "sinch-api-token",
        secret: true,
        description: "Sinch API token.",
      },
      {
        key: "sender_id",
        label: "Sender ID",
        placeholder: "CONVERSAI",
        description: "Alphanumeric or numeric sender.",
      },
    ],
  },
  {
    provider: "whatsapp_cloud",
    label: "WhatsApp Cloud API",
    description:
      "Stores WhatsApp Cloud credentials for simulated transport in the hackathon build.",
    channels: ["whatsapp"],
    mode: "simulated",
    fields: [
      {
        key: "phone_number_id",
        label: "Phone Number ID",
        placeholder: "123456789012345",
        description: "Meta WhatsApp phone number ID.",
      },
      {
        key: "business_account_id",
        label: "Business Account ID",
        placeholder: "987654321098765",
        description: "WhatsApp Business account ID.",
      },
      {
        key: "access_token",
        label: "Access Token",
        placeholder: "meta-access-token",
        secret: true,
        description: "Permanent or long-lived access token.",
      },
    ],
  },
  {
    provider: "google_rcs",
    label: "Google RCS",
    description:
      "Captures RCS business messaging configuration and enables simulated sends.",
    channels: ["rcs"],
    mode: "simulated",
    fields: [
      {
        key: "agent_id",
        label: "Agent ID",
        placeholder: "agent-id",
        description: "RCS agent identifier.",
      },
      {
        key: "brand_id",
        label: "Brand ID",
        placeholder: "brand-id",
        description: "Associated brand identifier.",
      },
      {
        key: "service_account_email",
        label: "Service Account Email",
        placeholder: "rcs-service@example.iam.gserviceaccount.com",
        description: "Service account email used by the RCS gateway.",
      },
    ],
  },
  {
    provider: "telegram_bot",
    label: "Telegram Bot",
    description:
      "Stores Telegram bot credentials. Sends are simulated while the connector is configured.",
    channels: ["telegram"],
    mode: "simulated",
    fields: [
      {
        key: "bot_token",
        label: "Bot Token",
        placeholder: "123456789:AAExampleToken",
        secret: true,
        description: "Telegram bot token from BotFather.",
      },
      {
        key: "bot_username",
        label: "Bot Username",
        placeholder: "@conversai_demo_bot",
        description: "Public Telegram bot handle.",
      },
    ],
  },
  {
    provider: "viber_bot",
    label: "Viber Bot",
    description:
      "Stores Viber bot credentials and keeps transport simulated in this MVP.",
    channels: ["viber"],
    mode: "simulated",
    fields: [
      {
        key: "bot_token",
        label: "Bot Token",
        placeholder: "viber-bot-token",
        secret: true,
        description: "Viber bot auth token.",
      },
      {
        key: "sender_name",
        label: "Sender Name",
        placeholder: "ConversAI Support",
        description: "Visible Viber sender name.",
      },
    ],
  },
];

export function isConnectorProvider(value: string): value is ConnectorProvider {
  return connectorProviders.includes(value as ConnectorProvider);
}

export function isConnectorStatus(value: string): value is ConnectorStatus {
  return connectorStatuses.includes(value as ConnectorStatus);
}

export function isConnectorTransportMode(
  value: string,
): value is ConnectorTransportMode {
  return connectorTransportModes.includes(value as ConnectorTransportMode);
}

export function getConnectorDefinition(provider: ConnectorProvider) {
  return connectorCatalog.find((definition) => definition.provider === provider) ?? null;
}

export function listProvidersForChannel(channel: MessagingChannel) {
  return connectorCatalog.filter((definition) => definition.channels.includes(channel));
}

function coerceCredentialValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function maskValue(value: string) {
  if (value.length <= 4) {
    return "•".repeat(Math.max(value.length, 1));
  }

  return `${value.slice(0, 3)}••••${value.slice(-2)}`;
}

export function maskConnectorConfig(config: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(config).map(([key, value]) => {
      const normalized = coerceCredentialValue(value);
      return [key, normalized ? maskValue(normalized) : "Not set"];
    }),
  );
}

export function sanitizeConnectorRow(row: ConnectorRow): ConnectorView {
  const definition = getConnectorDefinition(row.provider);

  return {
    id: row.id,
    channel: row.channel,
    name: row.name,
    provider: row.provider,
    provider_label: definition?.label ?? row.provider,
    transport_mode: row.transport_mode,
    status: row.status,
    error_message: row.error_message,
    last_tested_at: row.last_tested_at,
    active: row.active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    config_summary: maskConnectorConfig(row.config),
  };
}

function validateStructuredProvider(
  provider: ConnectorProvider,
  credentials: Record<string, string>,
) {
  switch (provider) {
    case "sinch_sms":
      if (credentials.service_plan_id.length < 6) {
        return "Service Plan ID looks too short.";
      }

      if (credentials.api_token.length < 10) {
        return "API Token looks too short.";
      }

      if (credentials.sender_id.length < 3) {
        return "Sender ID must be at least 3 characters.";
      }

      return null;
    case "whatsapp_cloud":
      if (!/^\d{8,}$/.test(credentials.phone_number_id)) {
        return "Phone Number ID must contain digits only.";
      }

      if (!/^\d{8,}$/.test(credentials.business_account_id)) {
        return "Business Account ID must contain digits only.";
      }

      if (credentials.access_token.length < 12) {
        return "Access Token looks too short.";
      }

      return null;
    case "google_rcs":
      if (credentials.agent_id.length < 4) {
        return "Agent ID looks too short.";
      }

      if (credentials.brand_id.length < 4) {
        return "Brand ID looks too short.";
      }

      if (!credentials.service_account_email.includes("@")) {
        return "Service Account Email must be a valid email address.";
      }

      return null;
    case "telegram_bot":
      if (!/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(credentials.bot_token)) {
        return "Bot Token does not match Telegram format.";
      }

      if (!/^@[A-Za-z0-9_]{4,}$/.test(credentials.bot_username)) {
        return "Bot Username must start with @ and use Telegram-safe characters.";
      }

      return null;
    case "viber_bot":
      if (credentials.bot_token.length < 10) {
        return "Bot Token looks too short.";
      }

      if (credentials.sender_name.length < 2) {
        return "Sender Name must be at least 2 characters.";
      }

      return null;
    case "conversai_sandbox":
      return null;
  }
}

export type ConnectorValidationResult =
  | {
      ok: true;
      normalizedCredentials: Record<string, string>;
      status: ConnectorStatus;
      transportMode: ConnectorTransportMode;
      message: string;
    }
  | {
      ok: false;
      error: string;
      normalizedCredentials: Record<string, string>;
    };

export function validateConnectorCredentials(
  provider: ConnectorProvider,
  credentials: Record<string, unknown>,
): ConnectorValidationResult {
  const definition = getConnectorDefinition(provider);

  if (!definition) {
    return {
      ok: false,
      error: "Unsupported connector provider.",
      normalizedCredentials: {},
    };
  }

  const normalizedCredentials = Object.fromEntries(
    definition.fields.map((field) => [
      field.key,
      coerceCredentialValue(credentials[field.key]),
    ]),
  );
  const missingFields = definition.fields
    .filter((field) => !normalizedCredentials[field.key])
    .map((field) => field.label);

  if (missingFields.length > 0) {
    return {
      ok: false,
      error: `Missing required credentials: ${missingFields.join(", ")}.`,
      normalizedCredentials,
    };
  }

  if (provider === "conversai_sandbox") {
    const sandboxMatches =
      normalizedCredentials.workspace_id === demoSandboxCredentials.workspace_id &&
      normalizedCredentials.app_key === demoSandboxCredentials.app_key &&
      normalizedCredentials.app_secret === demoSandboxCredentials.app_secret;

    if (!sandboxMatches) {
      return {
        ok: false,
        error:
          "Sandbox credentials do not match the published ConversAI demo profile.",
        normalizedCredentials,
      };
    }

    return {
      ok: true,
      normalizedCredentials,
      status: "connected",
      transportMode: "sandbox",
      message:
        "Sandbox connector connected. Messages will stay inside the ConversAI simulator.",
    };
  }

  const structuredError = validateStructuredProvider(
    provider,
    normalizedCredentials,
  );

  if (structuredError) {
    return {
      ok: false,
      error: structuredError,
      normalizedCredentials,
    };
  }

  return {
    ok: true,
    normalizedCredentials,
    status: "configured",
    transportMode: "simulated",
    message:
      "Credentials saved. External provider verification is not enabled in this MVP, so delivery remains simulated.",
  };
}
