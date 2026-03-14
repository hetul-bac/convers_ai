"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  MessageSquareLock,
  PhoneCall,
  XCircle,
} from "lucide-react";

type VerificationState =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

const channelOptions = [
  {
    value: "sms",
    label: "SMS",
    description: "Fastest path for a classic OTP flow.",
    accent: "bg-[#ebf5ff] text-[#3182ce]",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    description: "Branded chat-style verification for mobile users.",
    accent: "bg-emerald-50 text-emerald-600",
  },
  {
    value: "voice",
    label: "Voice",
    description: "Simulated call delivery for accessibility fallback.",
    accent: "bg-amber-50 text-amber-600",
  },
] as const;

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function VerifyWorkspace() {
  const [phone, setPhone] = useState("+919876543210");
  const [channel, setChannel] = useState<(typeof channelOptions)[number]["value"]>("sms");
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [expiresIn, setExpiresIn] = useState(0);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationState>(null);
  const [isSending, startSending] = useTransition();
  const [isChecking, startChecking] = useTransition();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!verificationId || expiresIn <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setExpiresIn((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [verificationId, expiresIn]);

  const code = digits.join("");
  const displayResult =
    result ??
    (expiresIn === 0 && verificationId
      ? {
          kind: "error" as const,
          message: "This verification code expired. Send a new OTP to continue.",
        }
      : null);

  const handleDigitChange = (index: number, value: string) => {
    const nextValue = value.replace(/\D/g, "").slice(-1);

    setDigits((current) => {
      const next = [...current];
      next[index] = nextValue;
      return next;
    });

    if (nextValue && index < inputRefs.current.length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);

    if (!pasted) {
      return;
    }

    event.preventDefault();
    const next = pasted.padEnd(6, " ").slice(0, 6).split("").map((digit) => digit.trim());
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 6) - 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const sendOtp = () => {
    startSending(async () => {
      setHelperMessage(null);
      setResult(null);

      const response = await fetch("/api/verify/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: phone,
          channel,
        }),
      });

      const payload = (await response.json()) as
        | { verification_id: string; expires_in: number }
        | { error: string };

      if (!response.ok || "error" in payload) {
        setResult({
          kind: "error",
          message: "error" in payload ? payload.error : "Failed to send OTP.",
        });
        return;
      }

      setVerificationId(payload.verification_id);
      setExpiresIn(payload.expires_in);
      setDigits(["", "", "", "", "", ""]);
      setHelperMessage(`OTP simulated successfully over ${channel.toUpperCase()}.`);
      setTimeout(() => inputRefs.current[0]?.focus(), 30);
    });
  };

  const verifyCode = () => {
    startChecking(async () => {
      if (!verificationId || code.length !== 6) {
        setResult({
          kind: "error",
          message: "Enter the 6-digit code before verifying.",
        });
        return;
      }

      const response = await fetch("/api/verify/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verification_id: verificationId,
          code,
        }),
      });

      const payload = (await response.json()) as
        | { valid: true }
        | { valid: false; reason: "wrong_code" | "expired" }
        | { error: string };

      if (!response.ok || "error" in payload) {
        setResult({
          kind: "error",
          message: "error" in payload ? payload.error : "Verification failed.",
        });
        return;
      }

      if (payload.valid) {
        setResult({
          kind: "success",
          message: "OTP verified. The judge-facing 2FA flow completed successfully.",
        });
        return;
      }

      setResult({
        kind: "error",
        message:
          payload.reason === "expired"
            ? "That code already expired. Send a new OTP."
            : "The code does not match. Try again.",
      });
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
      <section className="surface-panel overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
                Step 1
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                Send a one-time password
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Choose a delivery channel, trigger the simulated OTP, then verify
                the 6-digit code with the second step below.
              </p>
            </div>
            <div className="surface-muted flex items-center gap-3 px-4 py-3 text-sm text-slate-600">
              <Clock3 className="h-4 w-4 text-[#3182ce]" />
              Codes expire in 10 minutes
            </div>
          </div>

          <div className="mt-8 grid gap-5">
            <label className="text-sm font-medium text-slate-800">
              Phone number
              <input
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-[#f8fbff] px-5 py-4 text-lg text-slate-900 outline-none focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+919876543210"
                value={phone}
              />
            </label>

            <div>
              <p className="text-sm font-medium text-slate-800">Channel</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {channelOptions.map((option) => {
                  const active = channel === option.value;

                  return (
                    <button
                      key={option.value}
                      className={`rounded-[28px] border px-4 py-4 text-left transition ${
                        active
                          ? "border-[#3182ce] bg-[#ebf5ff]"
                          : "border-slate-200 bg-white hover:border-[#3182ce]/40 hover:bg-slate-50"
                      }`}
                      onClick={() => setChannel(option.value)}
                      type="button"
                    >
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${option.accent}`}>
                        {option.label}
                      </span>
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {option.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#3182ce] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#2769a8] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSending}
            onClick={sendOtp}
            type="button"
          >
            <MessageSquareLock className="h-4 w-4" />
            {isSending ? "Sending..." : "Send OTP"}
          </button>

          {helperMessage ? (
            <p className="mt-4 text-sm text-emerald-600">{helperMessage}</p>
          ) : null}
        </div>

        <div className="px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#3182ce]">
                Step 2
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">
                Verify the 6-digit OTP
              </h2>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
                verificationId && expiresIn > 0
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              <Clock3 className="h-4 w-4" />
              {verificationId ? formatCountdown(expiresIn) : "Awaiting OTP"}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputRefs.current[index] = element;
                }}
                className="h-[60px] w-14 rounded-[22px] border border-slate-200 bg-[#f8fbff] text-center text-2xl font-semibold text-slate-950 outline-none transition focus:border-[#3182ce] focus:ring-2 focus:ring-[#3182ce]/20 sm:h-[72px] sm:w-16"
                inputMode="numeric"
                maxLength={1}
                onChange={(event) => handleDigitChange(index, event.target.value)}
                onKeyDown={(event) => handleKeyDown(index, event)}
                onPaste={handlePaste}
                value={digit}
              />
            ))}
          </div>

          {verificationId ? (
            <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-400">
              Verification ID {verificationId}
            </p>
          ) : null}

          <button
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!verificationId || expiresIn === 0 || code.length !== 6 || isChecking}
            onClick={verifyCode}
            type="button"
          >
            <ArrowRight className="h-4 w-4" />
            {isChecking ? "Verifying..." : "Verify Code"}
          </button>

          {displayResult ? (
            <div
              className={`mt-6 rounded-[28px] border px-5 py-4 ${
                displayResult.kind === "success"
                  ? "border-emerald-100 bg-emerald-50"
                  : "border-rose-100 bg-rose-50"
              }`}
            >
              <div className="flex items-start gap-3">
                {displayResult.kind === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 text-rose-600" />
                )}
                <p
                  className={`text-sm leading-7 ${
                    displayResult.kind === "success"
                      ? "text-emerald-700"
                      : "text-rose-700"
                  }`}
                >
                  {displayResult.message}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-6">
        <article className="surface-panel p-6">
          <p className="text-sm uppercase tracking-[0.22em] text-[#3182ce]">
            Judge Demo
          </p>
          <h3 className="mt-3 text-2xl font-semibold text-slate-950">
            Why this flow matters
          </h3>
          <div className="mt-6 grid gap-4">
            <div className="surface-muted px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">Omnichannel OTP</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Demonstrates SMS, WhatsApp, and voice fallback from one API family.
              </p>
            </div>
            <div className="surface-muted px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">Expiry aware</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Countdown and invalid-state handling mirror real production verification UX.
              </p>
            </div>
            <div className="surface-muted px-4 py-4">
              <p className="text-sm font-semibold text-slate-950">Ready for API keys</p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                The same route pair is documented for direct backend integration.
              </p>
            </div>
          </div>
        </article>

        <article className="surface-panel p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-[#ebf5ff] text-[#3182ce]">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-slate-400">
                Suggested test input
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950">
                Use `+919876543210`
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            That seeded number resolves to India with a realistic mobile carrier, so
            the flow demonstrates lookup + OTP behavior cleanly.
          </p>
        </article>
      </section>
    </div>
  );
}
