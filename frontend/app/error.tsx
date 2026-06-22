"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-white">
      <section className="max-w-md rounded-lg border border-rose-300/20 bg-rose-400/10 p-6 text-center shadow-2xl shadow-black/25">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-rose-200">
          Something went wrong
        </p>
        <h1 className="mt-3 text-2xl font-semibold">DineFlow needs a refresh</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          {error.message || "An unexpected interface error occurred."}
        </p>
        <Button
          className="mt-5 bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
          onClick={reset}
        >
          Try again
        </Button>
      </section>
    </main>
  );
}
