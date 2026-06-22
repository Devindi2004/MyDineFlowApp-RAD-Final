"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Clock3, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, recommendedMenuItems } from "@/lib/data/menu";
import type { MenuItem } from "@/types/menu";

type AiRecommendationsProps = {
  onAddItem: (item: MenuItem) => void;
  recommendedItems?: MenuItem[];
};

export function AiRecommendations({
  onAddItem,
  recommendedItems = recommendedMenuItems,
}: AiRecommendationsProps) {
  return (
    <section className="rounded-none border-y border-white/10 bg-[linear-gradient(110deg,rgba(5,46,35,0.88),rgba(9,9,11,0.98)_48%,rgba(67,32,14,0.78))] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-emerald-100">
              <Sparkles className="size-3.5" aria-hidden="true" />
              AI Recommendation Engine
            </div>
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">
              Recommended for you
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
              Based on your previous orders, live table trends, prep time, and
              popular pairings from tonight&apos;s service.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-200">
            <TrendingUp className="size-4 text-orange-300" aria-hidden="true" />
            38% higher reorder match
          </div>
        </div>

        <div className="mt-6 flex snap-x gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible xl:grid-cols-4">
          {recommendedItems.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              className="min-w-[78vw] snap-start overflow-hidden rounded-lg border border-white/10 bg-zinc-950/72 shadow-2xl shadow-black/20 backdrop-blur sm:min-w-[340px] md:min-w-0"
            >
              <div className="relative aspect-[5/3]">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent" />
                <span className="absolute right-3 top-3 rounded-full bg-orange-400/90 px-2.5 py-1 text-xs font-semibold text-zinc-950">
                  {item.rating}
                </span>
                <span className="absolute left-3 top-3 rounded-full border border-emerald-300/20 bg-emerald-300/15 px-2.5 py-1 text-xs font-semibold text-emerald-100">
                  AI pick
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {item.name}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-zinc-400">
                      {item.recommendationReason ??
                        "A smart upsell based on table preferences."}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-xs text-zinc-300">
                    <Clock3 className="size-3" />
                    {item.prepTime}m
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm font-semibold text-emerald-200">
                    {formatCurrency(item.price)}
                  </span>
                  <Button
                    size="sm"
                    className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                    onClick={() => onAddItem(item)}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
