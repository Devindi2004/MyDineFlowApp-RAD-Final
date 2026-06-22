import { Loader2 } from "lucide-react";

export function LoadingShell({ label = "Loading DineFlow" }: { label?: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-4 text-white">
      <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 text-center shadow-2xl shadow-black/25">
        <Loader2 className="mx-auto size-6 animate-spin text-emerald-300" />
        <p className="mt-3 text-sm text-zinc-400">{label}</p>
      </div>
    </main>
  );
}
