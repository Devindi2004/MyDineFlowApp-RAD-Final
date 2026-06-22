import { Suspense } from "react";
import type { Metadata } from "next";
import { Loader2 } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to DineFlow.",
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center bg-zinc-950 text-white">
          <Loader2 className="size-6 animate-spin text-emerald-300" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
