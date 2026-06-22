"use client";

import Image from "next/image";
import { motion, type PanInfo } from "framer-motion";
import { CreditCard, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/data/menu";
import type { CartItem } from "@/types/menu";

type CartSheetProps = {
  open: boolean;
  items: CartItem[];
  summary: {
    count: number;
    subtotal: number;
    serviceCharge: number;
    tax: number;
    total: number;
  };
  onClose: () => void;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onCheckout: () => void;
};

const sheetTransition = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.9,
} as const;

function vibrate(pattern: number | number[] = 12) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export function CartSheet({
  open,
  items,
  summary,
  onClose,
  onRemove,
  onUpdateQuantity,
  onCheckout,
}: CartSheetProps) {
  const closeWithFeedback = () => {
    vibrate(8);
    onClose();
  };

  const handleMobileDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldClose = info.offset.y > 90 || info.velocity.y > 650;

    if (shouldClose) {
      closeWithFeedback();
    }
  };

  return (
    <div
      className={
        open
          ? "fixed inset-0 z-[80] pointer-events-auto"
          : "fixed inset-0 z-[80] pointer-events-none"
      }
      aria-hidden={!open}
    >
      <motion.button
        type="button"
        aria-label="Close cart"
        className="absolute inset-0 bg-black/65 backdrop-blur-sm"
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        onClick={closeWithFeedback}
      />

      <motion.aside
        className="absolute inset-x-0 bottom-0 flex max-h-[88svh] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl shadow-black/50 md:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Order cart"
        initial={false}
        animate={{ y: open ? 0 : "104%" }}
        transition={sheetTransition}
        drag={open ? "y" : false}
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.02, bottom: 0.38 }}
        onDragStart={() => vibrate(5)}
        onDragEnd={handleMobileDragEnd}
      >
        <div className="flex touch-none justify-center px-5 pb-1 pt-3">
          <div className="h-1.5 w-12 rounded-full bg-white/20" />
        </div>
        <CartContent
          items={items}
          summary={summary}
          onCheckout={onCheckout}
          onClose={closeWithFeedback}
          onRemove={onRemove}
          onUpdateQuantity={onUpdateQuantity}
        />
      </motion.aside>

      <motion.aside
        className="absolute right-0 top-0 hidden h-full w-[430px] max-w-full flex-col border-l border-white/10 bg-zinc-950 text-white shadow-2xl md:flex"
        role="dialog"
        aria-modal="true"
        aria-label="Order cart"
        initial={false}
        animate={{ x: open ? 0 : "100%" }}
        transition={sheetTransition}
      >
        <CartContent
          items={items}
          summary={summary}
          onCheckout={onCheckout}
          onClose={closeWithFeedback}
          onRemove={onRemove}
          onUpdateQuantity={onUpdateQuantity}
        />
      </motion.aside>
    </div>
  );
}

type CartContentProps = Omit<CartSheetProps, "open">;

function CartContent({
  items,
  summary,
  onClose,
  onRemove,
  onUpdateQuantity,
  onCheckout,
}: CartContentProps) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-white/10 px-5 pb-4 pt-3 md:p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-emerald-200/70 md:text-sm">
            Table 07
          </p>
          <h2 className="mt-1 text-xl font-semibold">Your order</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4 md:p-5">
        {items.length === 0 ? (
          <div className="flex min-h-[42svh] flex-col items-center justify-center text-center md:h-full">
            <div className="flex size-14 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-200">
              <ShoppingBag className="size-7" />
            </div>
            <p className="mt-4 text-lg font-semibold">Your cart is empty</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-400">
              Add dishes from the menu and they will appear here for checkout.
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {items.map((item) => (
              <article
                key={item.id}
                className="grid grid-cols-[72px_1fr] gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="relative size-[72px] overflow-hidden rounded-md">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold leading-5">
                        {item.name}
                      </h3>
                      <p className="mt-1 text-xs text-zinc-400">
                        {formatCurrency(item.price)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onRemove(item.id)}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="size-3.5 text-zinc-400" />
                    </Button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex min-h-10 items-center gap-2 rounded-full border border-white/10 p-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          onUpdateQuantity(item.id, item.quantity - 1)
                        }
                        aria-label={`Decrease ${item.name}`}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-5 text-center text-sm">
                        {item.quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          onUpdateQuantity(item.id, item.quantity + 1)
                        }
                        aria-label={`Increase ${item.name}`}
                      >
                        <Plus className="size-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold text-emerald-200">
                      {formatCurrency(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <footer className="border-t border-white/10 bg-zinc-950 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:p-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal</span>
            <span>{formatCurrency(summary.subtotal)}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Service</span>
            <span>{formatCurrency(summary.serviceCharge)}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Tax</span>
            <span>{formatCurrency(summary.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-3 text-base font-semibold">
            <span>Total</span>
            <span className="text-emerald-200">
              {formatCurrency(summary.total)}
            </span>
          </div>
        </div>
        <Button
          className="mt-5 min-h-11 w-full bg-orange-400 text-zinc-950 hover:bg-orange-300"
          disabled={items.length === 0}
          onClick={onCheckout}
        >
          <CreditCard className="size-4" />
          Proceed to checkout
        </Button>
      </footer>
    </>
  );
}
