"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CartItem, MenuItem } from "@/types/menu";

const CART_STORAGE_KEY = "dineflow.cart.v2";

export type PaymentMethod = "payhere" | "card" | "cash";

export type CheckoutDraft = {
  customerName: string;
  tableNo: string;
  contactNumber: string;
  specialInstructions: string;
  paymentMethod: PaymentMethod;
};

export type CartSummary = {
  count: number;
  subtotal: number;
  serviceCharge: number;
  tax: number;
  total: number;
};

type CartStore = {
  items: CartItem[];
  checkoutDraft: CheckoutDraft;
  addItem: (menuItem: MenuItem) => void;
  clearCart: () => void;
  removeItem: (id: string) => void;
  resetCheckoutDraft: () => void;
  setCheckoutDraft: (draft: Partial<CheckoutDraft>) => void;
  updateQuantity: (id: string, quantity: number) => void;
};

const defaultCheckoutDraft: CheckoutDraft = {
  customerName: "",
  tableNo: "07",
  contactNumber: "",
  specialInstructions: "",
  paymentMethod: "payhere",
};

function calculateSummary(items: CartItem[]): CartSummary {
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const serviceCharge = Math.round(subtotal * 0.1);
  const tax = Math.round(subtotal * 0.025);

  return {
    count: items.reduce((total, item) => total + item.quantity, 0),
    subtotal,
    serviceCharge,
    tax,
    total: subtotal + serviceCharge + tax,
  };
}

const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      checkoutDraft: defaultCheckoutDraft,

      addItem: (menuItem) =>
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.id === menuItem.id
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === menuItem.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            };
          }

          return {
            items: [...state.items, { ...menuItem, quantity: 1 }],
          };
        }),

      clearCart: () => set({ items: [] }),

      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      resetCheckoutDraft: () =>
        set({
          checkoutDraft: defaultCheckoutDraft,
        }),

      setCheckoutDraft: (draft) =>
        set((state) => ({
          checkoutDraft: {
            ...state.checkoutDraft,
            ...draft,
          },
        })),

      updateQuantity: (id, quantity) =>
        set((state) => {
          if (quantity < 1) {
            return {
              items: state.items.filter((item) => item.id !== id),
            };
          }

          return {
            items: state.items.map((item) =>
              item.id === id ? { ...item, quantity } : item
            ),
          };
        }),
    }),
    {
      name: CART_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
        checkoutDraft: state.checkoutDraft,
      }),
      version: 1,
    }
  )
);

export function useCart() {
  const items = useCartStore((state) => state.items);
  const summary = useMemo(() => calculateSummary(items), [items]);

  return {
    items,
    summary,
    addItem: useCartStore((state) => state.addItem),
    checkoutDraft: useCartStore((state) => state.checkoutDraft),
    clearCart: useCartStore((state) => state.clearCart),
    removeItem: useCartStore((state) => state.removeItem),
    resetCheckoutDraft: useCartStore((state) => state.resetCheckoutDraft),
    setCheckoutDraft: useCartStore((state) => state.setCheckoutDraft),
    updateQuantity: useCartStore((state) => state.updateQuantity),
  };
}

export { calculateSummary, useCartStore };
