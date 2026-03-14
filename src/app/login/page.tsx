"use client";

import { useState, useTransition } from "react";
import { Bot, Chrome, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSignIn = () => {
    startTransition(async () => {
      setError(null);

      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message);
      }
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f172a] px-6 py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#2563eb33_0%,transparent_35%),radial-gradient(circle_at_bottom_left,#14b8a633_0%,transparent_30%)]" />

      <div className="relative w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.55)]">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
          <section className="bg-[#0f172a] px-8 py-10 text-white sm:px-12 sm:py-14">
            <div className="flex items-center justify-center gap-3 lg:justify-start">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-cyan-400/15 text-cyan-200">
                <Bot className="h-7 w-7" />
              </div>
              <div className="text-center lg:text-left">
                <p className="text-2xl font-semibold tracking-wide">
                  ConversAI
                </p>
                <p className="text-xs uppercase tracking-[0.34em] text-slate-400">
                  The Intelligent NextGen CPaaS
                </p>
              </div>
            </div>

            <div className="mt-16 max-w-xl">
              <p className="text-sm uppercase tracking-[0.28em] text-cyan-300/70">
                Conversational Control Center
              </p>
              <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
                Ship faster campaigns across every modern messaging channel.
              </h1>
              <p className="mt-6 text-base leading-8 text-slate-300">
                Unify delivery, sentiment, and AI optimization in a single
                workspace designed for hackathon speed and production-style
                visibility.
              </p>
            </div>
          </section>

          <section className="flex items-center bg-white px-8 py-10 sm:px-12 sm:py-14">
            <div className="w-full">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                Secure Access
              </div>
              <h2 className="mt-6 text-3xl font-semibold text-slate-950">
                Sign in to your workspace
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Use your Google account to access dashboards, inbox analysis,
                AI-powered optimization tools, and create your organization on
                first login.
              </p>

              <button
                className="mt-10 flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 py-4 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isPending}
                onClick={handleSignIn}
                type="button"
              >
                <Chrome className="h-5 w-5" />
                {isPending ? "Connecting..." : "Sign in with Google"}
              </button>

              {error ? (
                <p className="mt-4 text-sm text-rose-600">{error}</p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
