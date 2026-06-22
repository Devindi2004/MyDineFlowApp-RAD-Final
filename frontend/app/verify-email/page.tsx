import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, MailWarning } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Email Verification",
  description: "DineFlow email verification status.",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{
    email?: string;
    status?: string;
  }>;
};

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { email, status } = await searchParams;
  const view = getVerificationView(status);

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <section className="rounded-lg border border-white/10 bg-white/[0.035] p-5 text-center shadow-2xl shadow-black/25">
          <div className={view.iconClass}>{view.icon}</div>
          <h1 className="mt-5 text-2xl font-semibold">{view.title}</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            {view.description}
          </p>
          {email && (
            <p className="mt-2 text-sm font-medium text-emerald-200">{email}</p>
          )}
          <Button
            asChild
            className="mt-6 min-h-11 w-full bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
          >
            <Link href={status === "success" ? "/login" : "/register"}>
              {status === "success" ? "Sign in" : "Create account"}
            </Link>
          </Button>
        </section>
      </div>
    </main>
  );
}

function getVerificationView(status?: string) {
  if (status === "success") {
    return {
      title: "Email verified",
      description:
        "Your DineFlow account is active. You can now sign in and continue to your workspace.",
      icon: <CheckCircle2 className="size-8" />,
      iconClass:
        "mx-auto flex size-16 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-200",
    };
  }

  if (status === "invalid" || status === "missing") {
    return {
      title: "Verification link expired",
      description:
        "This verification link is invalid or expired. Request a new email from the check-email screen.",
      icon: <MailWarning className="size-8" />,
      iconClass:
        "mx-auto flex size-16 items-center justify-center rounded-lg bg-orange-400/10 text-orange-200",
    };
  }

  return {
    title: "Verification unavailable",
    description:
      "We could not verify this email right now. Please try again or request another verification email.",
    icon: <CircleAlert className="size-8" />,
    iconClass:
      "mx-auto flex size-16 items-center justify-center rounded-lg bg-rose-400/10 text-rose-200",
  };
}
