"use client";

import { useEffect, useMemo, useState } from "react";
import { MessageCircleMore } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SentimentBadge } from "@/components/SentimentBadge";
import { formatTimestamp } from "@/lib/datetime";

type InboxMessage = {
  id: string;
  org_id?: string;
  body: string;
  channel: string;
  status: string;
  sentiment_label: string | null;
  sentiment_score: number | null;
  created_at: string;
};

function sortMessages(messages: InboxMessage[]) {
  return [...messages].sort((left, right) => {
    const leftNegative = left.sentiment_label?.toLowerCase() === "negative";
    const rightNegative = right.sentiment_label?.toLowerCase() === "negative";

    if (leftNegative !== rightNegative) {
      return leftNegative ? -1 : 1;
    }

    return (
      new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );
  });
}

export function InboxRealtime({
  initialMessages,
  orgId,
}: {
  initialMessages: InboxMessage[];
  orgId: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState<InboxMessage[]>(
    sortMessages(initialMessages),
  );

  useEffect(() => {
    const channel = supabase
      .channel("messages-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const row = (payload.new || payload.old) as InboxMessage;

          if (row.org_id && row.org_id !== orgId) {
            return;
          }

          setMessages((current) => {
            const next = current.filter((item) => item.id !== row.id);

            if (payload.eventType !== "DELETE" && payload.new) {
              next.unshift(payload.new as InboxMessage);
            }

            return sortMessages(next);
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orgId, supabase]);

  if (messages.length === 0) {
    return (
      <div className="surface-panel flex min-h-[320px] flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#ebf5ff] text-[#3182ce]">
          <MessageCircleMore className="h-7 w-7" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Inbox is empty</h2>
          <p className="mt-2 max-w-md text-sm leading-7 text-slate-600">
            Seed your project or send a few test messages to see realtime updates here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <article
          key={message.id}
          className="surface-panel flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between"
        >
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="accent-chip inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">
                {message.channel}
              </span>
              <span className="text-xs uppercase tracking-[0.22em] text-slate-400">
                {message.status}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-800">
              {message.body}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 text-sm text-slate-500 lg:items-end">
            <SentimentBadge label={message.sentiment_label} />
            <span>
              Score:{" "}
              {message.sentiment_score === null
                ? "Pending"
                : message.sentiment_score.toFixed(2)}
            </span>
            <span>{formatTimestamp(message.created_at)}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
