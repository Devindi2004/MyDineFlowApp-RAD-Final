"use client";

import { useEffect, useState } from "react";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type ResendVerificationCardProps = {
  email: string;
};

export function ResendVerificationCard({ email }: ResendVerificationCardProps) {
  const [cooldown, setCooldown] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const resend = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();

      if (!response.ok) {
        if (payload.cooldownSeconds) {
          setCooldown(payload.cooldownSeconds);
        }
        throw new Error(payload.error ?? "Unable to resend email.");
      }

      setCooldown(60);
      toast.success("Verification email sent", {
        description: "Please check your inbox and spam folder.",
      });
    } catch (error) {
      toast.error("Could not resend verification email", {
        description:
          error instanceof Error ? error.message : "Please try again shortly.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-center shadow-2xl shadow-black/25">
      <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-200">
        <MailCheck className="size-7" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-white">
        Check your email
      </h1>
      <p className="mt-3 text-sm leading-6 text-zinc-400">
        We sent a secure verification link to{" "}
        <span className="font-medium text-emerald-200">{email}</span>. The link
        expires in 24 hours.
      </p>
      <Button
        className="mt-6 min-h-11 w-full bg-orange-400 text-zinc-950 hover:bg-orange-300"
        disabled={loading || cooldown > 0}
        onClick={resend}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
      </Button>
    </div>
  );
}
