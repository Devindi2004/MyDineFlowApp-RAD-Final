import { ChefHat } from "lucide-react";
import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  compact?: boolean;
};

export function BrandMark({ className, compact = false }: BrandMarkProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex size-10 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-400/15 text-emerald-200 shadow-[0_0_30px_rgba(16,185,129,0.18)]">
        <ChefHat className="size-5" aria-hidden="true" />
      </div>
      {!compact && (
        <div className="leading-none">
          <p className="text-lg font-semibold tracking-wide text-white">
            DineFlow
          </p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.28em] text-emerald-200/70">
            Smart Dining
          </p>
        </div>
      )}
    </div>
  );
}
