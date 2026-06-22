"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import {
  Loader2,
  Leaf,
  Search,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { AiRecommendations } from "@/components/customer/ai-recommendations";
import { CartSheet } from "@/components/customer/cart-sheet";
import { MenuItemCard } from "@/components/customer/menu-item-card";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/use-cart";
import { useFavorites } from "@/hooks/use-favorites";
import {
  formatCurrency,
  menuCategories,
  recommendedMenuItems,
} from "@/lib/data/menu";
import { getMenuItems } from "@/lib/services/menu-service";
import { cn } from "@/lib/utils";
import type { DietaryTag, MenuCategory, MenuItem } from "@/types/menu";

const filters: { label: string; value: DietaryTag | "all"; icon: typeof Leaf }[] = [
  { label: "All", value: "all", icon: SlidersHorizontal },
  { label: "Chef picks", value: "chef-pick", icon: Sparkles },
  { label: "Vegetarian", value: "vegetarian", icon: Leaf },
  { label: "High protein", value: "high-protein", icon: Utensils },
];

type MenuExperienceProps = {
  initialRestaurantId?: string;
  initialTableNumber?: string;
};

export function MenuExperience({
  initialRestaurantId = "rest123",
  initialTableNumber = "07",
}: MenuExperienceProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<MenuCategory>("All");
  const [activeFilter, setActiveFilter] = useState<DietaryTag | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();
  const favorites = useFavorites();
  const setCheckoutDraft = cart.setCheckoutDraft;
  const tableNumber = String(initialTableNumber || "07").padStart(2, "0");
  const tableLabel = `Table ${tableNumber}`;
  const {
    data: serviceMenuItems = [],
    isError,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["menu", initialRestaurantId],
    queryFn: getMenuItems,
  });

  useEffect(() => {
    setCheckoutDraft({ tableNo: tableNumber });
  }, [setCheckoutDraft, tableNumber]);

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return serviceMenuItems.filter((item) => {
      const matchesCategory =
        activeCategory === "All" || item.category === activeCategory;
      const matchesFilter =
        activeFilter === "all" || item.tags.includes(activeFilter);
      const matchesSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);

      return matchesCategory && matchesFilter && matchesSearch;
    });
  }, [activeCategory, activeFilter, searchQuery, serviceMenuItems]);

  const smartRecommendations = useMemo(() => {
    const cartCategories = new Set(cart.items.map((item) => item.category));
    const favoriteItems = serviceMenuItems.filter((item) =>
      favorites.favoriteIds.includes(item.id)
    );
    const recentItems = serviceMenuItems.filter((item) =>
      favorites.recentlyOrderedIds.includes(item.id)
    );
    const categoryMatches = serviceMenuItems.filter((item) =>
      cartCategories.has(item.category)
    );

    return [
      ...favoriteItems,
      ...recentItems,
      ...categoryMatches,
      ...recommendedMenuItems,
    ]
      .filter(
        (item, index, list) =>
          list.findIndex((candidate) => candidate.id === item.id) === index
      )
      .slice(0, 4);
  }, [
    cart.items,
    favorites.favoriteIds,
    favorites.recentlyOrderedIds,
    serviceMenuItems,
  ]);

  const addItem = (item: MenuItem) => {
    cart.addItem(item);
    favorites.addRecent(item.id);
    toast.success(`${item.name} added`, {
      description: `${formatCurrency(item.price)} added to ${tableLabel}`,
    });
  };

  const toggleFavorite = (item: MenuItem) => {
    favorites.toggleFavorite(item.id);
    toast.success(
      favorites.isFavorite(item.id)
        ? "Removed from favorites"
        : "Added to favorites",
      {
        description: item.name,
      }
    );
  };

  const handleCheckout = () => {
    setCartOpen(false);
    router.push(`/checkout?table=${tableNumber}&restaurant=${initialRestaurantId}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-zinc-950/86 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandMark />
          <div className="hidden items-center gap-3 md:flex">
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-100">
              QR {tableLabel}
            </span>
            <Button
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="size-4" />
              {cart.summary.count}
              <span className="hidden sm:inline">
                {formatCurrency(cart.summary.total)}
              </span>
            </Button>
          </div>
          <Button
            size="icon-lg"
            className="bg-emerald-400 text-zinc-950 hover:bg-emerald-300 md:hidden"
            onClick={() => setCartOpen(true)}
            aria-label="Open cart"
          >
            <ShoppingCart className="size-4" />
          </Button>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(6,78,59,0.46),rgba(9,9,11,0.98)_42%,rgba(67,32,14,0.5))]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-14">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.32em] text-orange-200">
              AI powered digital menu
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-white sm:text-6xl">
              Order faster with a menu that understands the table.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300 sm:text-lg">
              Browse high-quality dishes, filter dietary preferences, receive
              personalized recommendations, and send a secure mock order to the
              kitchen flow.
            </p>
            <div className="mt-7 grid max-w-xl grid-cols-3 gap-3">
              {[
                ["40%", "faster service"],
                ["4.8", "avg rating"],
                ["8 min", "quickest prep"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="rounded-lg border border-white/10 bg-black/25 p-3"
                >
                  <p className="text-xl font-semibold text-emerald-200">
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/25 p-4 shadow-2xl shadow-black/25 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-400">Live kitchen load</p>
                <p className="mt-1 text-2xl font-semibold">Moderate</p>
              </div>
              <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-sm text-emerald-100">
                12 active orders
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {[
                ["New orders", "78%"],
                ["Preparing", "52%"],
                ["Ready", "34%"],
              ].map(([label, width]) => (
                <div key={label}>
                  <div className="mb-2 flex justify-between text-sm text-zinc-300">
                    <span>{label}</span>
                    <span>{width}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-orange-300"
                      style={{ width }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <AiRecommendations
        onAddItem={addItem}
        recommendedItems={smartRecommendations}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Digital QR menu</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {isLoading
                ? "Loading today's service menu..."
                : `${filteredItems.length} dishes available from today's service menu.`}
            </p>
          </div>
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search dishes, ingredients, categories"
              className="h-11 border-white/10 bg-white/[0.05] pl-10 text-white placeholder:text-zinc-500"
            />
          </div>
        </div>

        {isError && (
          <div className="mt-5 rounded-lg border border-orange-300/20 bg-orange-400/10 p-4 text-sm text-orange-100">
            Backend menu data is unavailable, so DineFlow is showing the local
            service menu fallback.
            <Button
              size="sm"
              variant="outline"
              className="ml-0 mt-3 border-white/10 bg-white/5 text-white hover:bg-white/10 sm:ml-3 sm:mt-0"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </div>
        )}

        <div className="sticky top-[73px] z-30 -mx-4 mt-6 border-y border-white/10 bg-zinc-950/92 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {menuCategories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                className={cn(
                  "shrink-0 rounded-full",
                  activeCategory === category
                    ? "bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                    : "border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/10"
                )}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {filters.map((filter) => {
              const Icon = filter.icon;
              const active = activeFilter === filter.value;

              return (
                <Button
                  key={filter.value}
                  variant="outline"
                  className={cn(
                    "shrink-0 rounded-full border-white/10 bg-transparent text-zinc-300 hover:bg-white/10",
                    active &&
                      "border-orange-300/40 bg-orange-400/15 text-orange-100"
                  )}
                  onClick={() => setActiveFilter(filter.value)}
                >
                  <Icon className="size-4" />
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {isLoading &&
              Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="min-h-[390px] animate-pulse rounded-lg border border-white/10 bg-white/[0.035]"
                >
                  <div className="h-52 rounded-t-lg bg-white/10" />
                  <div className="space-y-3 p-5">
                    <div className="h-4 w-2/3 rounded bg-white/10" />
                    <div className="h-3 w-full rounded bg-white/10" />
                    <div className="h-3 w-4/5 rounded bg-white/10" />
                    <div className="flex justify-between pt-4">
                      <div className="h-9 w-24 rounded bg-white/10" />
                      <div className="h-9 w-20 rounded bg-white/10" />
                    </div>
                  </div>
                </div>
              ))}
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                favorite={favorites.isFavorite(item.id)}
                item={item}
                onAddItem={addItem}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        </AnimatePresence>

        {isLoading && (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-zinc-400">
            <Loader2 className="size-4 animate-spin text-emerald-300" />
            Connecting to restaurant menu API
          </div>
        )}

        {!isLoading && filteredItems.length === 0 && (
          <div className="mt-10">
            <EmptyState
              description="Try a different search term or clear one of the active filters."
              title="No matching dishes"
            />
          </div>
        )}
      </main>

      <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden">
        <Button
          className="h-12 w-full justify-between bg-orange-400 px-4 text-zinc-950 shadow-2xl shadow-orange-950/30 hover:bg-orange-300"
          onClick={() => setCartOpen(true)}
        >
          <span className="flex items-center gap-2">
            <ShoppingCart className="size-4" />
            {cart.summary.count} items
          </span>
          <span>{formatCurrency(cart.summary.total)}</span>
        </Button>
      </div>

      <CartSheet
        open={cartOpen}
        items={cart.items}
        summary={cart.summary}
        onClose={() => setCartOpen(false)}
        onRemove={cart.removeItem}
        onUpdateQuantity={cart.updateQuantity}
        onCheckout={handleCheckout}
      />
    </div>
  );
}
