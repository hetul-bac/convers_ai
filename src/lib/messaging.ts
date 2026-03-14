export const allowedChannels = [
  "sms",
  "whatsapp",
  "rcs",
  "telegram",
  "viber",
] as const;

export type MessagingChannel = (typeof allowedChannels)[number];

export const costMap: Record<MessagingChannel, number> = {
  sms: 0.0075,
  whatsapp: 0.005,
  rcs: 0.008,
  telegram: 0.002,
  viber: 0.003,
};

export function isMessagingChannel(value: string): value is MessagingChannel {
  return allowedChannels.includes(value as MessagingChannel);
}

export function simulateDeliveryStatus() {
  return Math.random() > 0.05 ? "delivered" : "failed";
}
