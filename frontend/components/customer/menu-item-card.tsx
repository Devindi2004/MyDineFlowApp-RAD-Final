"use client";

import Image from "next/image";
import { Clock, Flame, Heart, Plus, Star } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/data/menu";
import { cn } from "@/lib/utils";
import type { MenuItem } from "@/types/menu";

type MenuItemCardProps = {
  favorite?: boolean;
  item: MenuItem;
  onAddItem: (item: MenuItem) => void;
  onToggleFavorite?: (item: MenuItem) => void;
};

const spiceTone: Record<MenuItem["spiceLevel"], string> = {
  mild: "text-emerald-200",
  medium: "text-orange-200",
  hot: "text-red-200",
};

export function MenuItemCard({
  favorite = false,
  item,
  onAddItem,
  onToggleFavorite,
}: MenuItemCardProps) {
  const disabled = item.inventoryStatus === "sold-out";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32 }}
    >
      <Card
        className="h-full rounded-lg border-white/10 bg-zinc-900/78 py-0 shadow-2xl shadow-black/20 transition hover:-translate-y-1 hover:border-emerald-300/30 hover:bg-zinc-900"
        onDoubleClick={() => onToggleFavorite?.(item)}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover transition duration-700 group-hover/card:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/10 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Badge className="border-white/10 bg-black/55 text-white backdrop-blur">
              {item.category}
            </Badge>
            {item.inventoryStatus === "limited" && (
              <Badge className="border-orange-300/30 bg-orange-400/20 text-orange-100">
                Limited
              </Badge>
            )}
          </div>
          <button
            type="button"
            aria-label={favorite ? "Remove favorite" : "Add favorite"}
            className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur transition hover:bg-black/75"
            onClick={() => onToggleFavorite?.(item)}
          >
            <Heart
              className={cn(
                "size-4",
                favorite && "fill-rose-400 text-rose-400"
              )}
            />
          </button>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs text-white backdrop-blur">
              <Star className="size-3.5 fill-orange-300 text-orange-300" />
              {item.rating}
            </div>
            <div
              className={cn(
                "flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs capitalize backdrop-blur",
                spiceTone[item.spiceLevel]
              )}
            >
              <Flame className="size-3.5" />
              {item.spiceLevel}
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold leading-tight text-white">
              {item.name}
            </h3>
            <p className="shrink-0 text-base font-semibold text-emerald-200">
              {formatCurrency(item.price)}
            </p>
          </div>
          <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-400">
            {item.description}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {favorite && (
              <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-2 py-1 text-[11px] text-rose-100">
                Favorite
              </span>
            )}
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 px-2 py-1 text-[11px] capitalize text-zinc-300"
              >
                {tag.replace("-", " ")}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Clock className="size-4 text-zinc-500" aria-hidden="true" />
              {item.prepTime} min prep
            </div>
            <Button
              disabled={disabled}
              onClick={() => onAddItem(item)}
              className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
            >
              <Plus className="size-4" aria-hidden="true" />
              {disabled ? "Sold out" : "Add"}
            </Button>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
