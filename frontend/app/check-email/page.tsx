import Link from "next/link";
import type { Metadata } from "next";
import { BrandMark } from "@/components/layout/brand-mark";
import { ResendVerificationCard } from "@/components/auth/resend-verification-card";

export const metadata: Metadata = {
  title: "Check Your Email",
  description: "Verify your DineFlow account email.",
};

type CheckEmailPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function CheckEmailPage({
  searchParams,
}: CheckEmailPageProps) {
  const { email } = await searchParams;
  const targetEmail = email ?? "your email address";

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 py-10 text-white">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <ResendVerificationCard email={targetEmail} />
        <p className="mt-5 text-center text-sm text-zinc-400">
          Already verified?{" "}
          <Link className="font-medium text-emerald-200" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
