import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmptyStateProps = {
  action?: React.ReactNode;
  description: string;
  title: string;
};

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-500">
        <SearchX className="size-6" />
      </div>
      <p className="mt-4 text-lg font-semibold text-white">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-zinc-400">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function EmptyActionButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button
      className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
