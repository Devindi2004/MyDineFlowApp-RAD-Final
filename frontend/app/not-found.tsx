import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-white">
      <section className="max-w-md rounded-lg border border-white/10 bg-white/[0.035] p-6 text-center shadow-2xl shadow-black/25">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-orange-200">
          404
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          This DineFlow screen is not available yet or the link has expired.
        </p>
        <Button
          asChild
          className="mt-5 bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
        >
          <Link href="/menu">Back to menu</Link>
        </Button>
      </section>
    </main>
  );
}
