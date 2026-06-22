"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Mail, Phone, UserRound } from "lucide-react";
import { toast } from "sonner";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getRoleRedirect } from "@/lib/auth/roles";

export function RegisterForm() {
  const router = useRouter();
  const { loading, register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const passwordScore = useMemo(() => {
    return [
      password.length >= 8,
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length;
  }, [password]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const payload = await register({
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        role: "customer",
      });

      toast.success("Account created", {
        description: "Check your inbox to verify your email.",
      });
      router.replace(
        payload.emailVerificationRequired
          ? `/check-email?email=${encodeURIComponent(
              String(formData.get("email") ?? "")
            )}`
          : payload.redirectTo ??
              (payload.user ? getRoleRedirect(payload.user.role) : "/menu")
      );
    } catch (authError) {
      setError(
        authError instanceof Error ? authError.message : "Unable to register."
      );
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 py-10 text-white">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <Card className="rounded-lg border border-white/10 bg-white/[0.035] py-0 shadow-2xl shadow-black/25">
          <CardContent className="p-5 sm:p-6">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-orange-200">
              Create account
            </p>
            <h1 className="mt-3 text-2xl font-semibold">Join DineFlow</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Register as a customer to order and track food.
            </p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <Field label="Full name" icon={<UserRound className="size-4" />}>
                <Input
                  name="name"
                  autoComplete="name"
                  required
                  placeholder="Tharushi Punchihewa"
                  className="min-h-11 border-white/10 bg-white/[0.04] text-white"
                />
              </Field>
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
              <Field label="Phone" icon={<Phone className="size-4" />}>
                <Input
                  name="phone"
                  autoComplete="tel"
                  placeholder="+94 77 123 4567"
                  className="min-h-11 border-white/10 bg-white/[0.04] text-white"
                />
              </Field>
              <Field label="Password" icon={<LockKeyhole className="size-4" />}>
                <Input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters and 1 number"
                  className="min-h-11 border-white/10 bg-white/[0.04] text-white"
                />
                <div className="mt-2 grid grid-cols-4 gap-1">
                  {[0, 1, 2, 3].map((index) => (
                    <div
                      key={index}
                      className={
                        index < passwordScore
                          ? "h-1.5 rounded-full bg-emerald-400"
                          : "h-1.5 rounded-full bg-white/10"
                      }
                    />
                  ))}
                </div>
              </Field>

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
                Create account
              </Button>

              <p className="text-center text-sm text-zinc-400">
                Already have an account?{" "}
                <Link className="font-medium text-emerald-200" href="/login">
                  Sign in
                </Link>
              </p>
            </form>
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
