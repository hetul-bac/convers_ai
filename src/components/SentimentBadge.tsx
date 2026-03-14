type SentimentBadgeProps = {
  label: string | null;
};

const badgeStyles: Record<string, string> = {
  negative: "bg-rose-50 text-rose-600 ring-1 ring-rose-100",
  neutral: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  positive: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100",
};

export function SentimentBadge({ label }: SentimentBadgeProps) {
  const normalized = (label ?? "neutral").toLowerCase();
  const style = badgeStyles[normalized] ?? badgeStyles.neutral;
  const text = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${style}`}
    >
      {text}
    </span>
  );
}
