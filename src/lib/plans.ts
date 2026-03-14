export const planMessageLimits = {
  free: 1000,
  starter: 10000,
  pro: 100000,
  enterprise: 1000000,
} as const;

export type PlanName = keyof typeof planMessageLimits;

export function getPlanMessageLimit(plan: string | null | undefined) {
  if (!plan) {
    return planMessageLimits.free;
  }

  return planMessageLimits[plan as PlanName] ?? planMessageLimits.free;
}
