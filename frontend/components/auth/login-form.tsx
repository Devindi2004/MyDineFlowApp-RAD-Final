"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getRoleRedirect } from "@/lib/auth/roles";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const payload = await login({
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
      });
      const requestedNext = searchParams.get("next");

      toast.success("Welcome back", {
        description: `Signed in as ${payload.user?.name ?? "DineFlow user"}.`,
      });
      router.replace(
        requestedNext ||
          payload.redirectTo ||
          (payload.user ? getRoleRedirect(payload.user.role) : "/menu")
      );
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : "Unable to login.";
      setError(message);

      if (message.toLowerCase().includes("verify your email")) {
        const email = String(formData.get("email") ?? "");
        router.push(`/check-email?email=${encodeURIComponent(email)}`);
      }
    }
  };

  return (
    <AuthShell
      eyebrow="Secure access"
      title="Sign in to DineFlow"
      description="Use your restaurant account to access menus, kitchen operations, or owner analytics."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        <Field label="Email" icon={<Mail className="size-4" />}>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@restaurant.lk"
            className="min-h-11 border-white/10 bg-white/[0.04] text-white"
          />
        </Field>
        <Field label="Password" icon={<LockKeyhole className="size-4" />}>
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            className="min-h-11 border-white/10 bg-white/[0.04] text-white"
          />
        </Field>

        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex min-h-11 items-center gap-2 text-zinc-300">
            <input
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              type="checkbox"
              className="size-4 rounded border-white/10 accent-emerald-400"
            />
            Remember me
          </label>
          <button
            type="button"
            className="min-h-11 text-emerald-200"
            onClick={() =>
              toast.info("Password reset is coming soon", {
                description:
                  "For now, ask an administrator to reset your DineFlow account.",
              })
            }
          >
            Forgot password?
          </button>
        </div>

        {error && (
          <p className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-3 text-sm text-rose-100">
            {error}
          </p>
        )}

        <Button
          className="min-h-11 w-full bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
          disabled={loading}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>

        <p className="text-center text-sm text-zinc-400">
          New to DineFlow?{" "}
          <Link className="font-medium text-emerald-200" href="/register">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

type AuthShellProps = {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
};

function AuthShell({ children, description, eyebrow, title }: AuthShellProps) {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0 shadow-2xl shadow-black/25">
          <CardContent className="p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-orange-200">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-2xl font-semibold">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
            <div className="mt-6">{children}</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

type FieldProps = {
  children: React.ReactNode;
  icon: React.ReactNode;
  label: string;
};

function Field({ children, icon, label }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-200">
        <span className="text-zinc-500">{icon}</span>
        {label}
      </span>
      {children}
    </label>
  );
}
