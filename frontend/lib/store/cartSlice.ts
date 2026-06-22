import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CartItem, MenuItem } from "@/types/menu";

type CartState = {
  items: CartItem[];
};

const initialState: CartState = {
  items: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    addCartItem(state, action: PayloadAction<MenuItem>) {
      const existing = state.items.find((item) => item.id === action.payload.id);
      if (existing) {
        existing.quantity += 1;
        return;
      }
      state.items.push({ ...action.payload, quantity: 1 });
    },
    clearCartItems(state) {
      state.items = [];
    },
    removeCartItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    updateCartQuantity(
      state,
      action: PayloadAction<{ id: string; quantity: number }>
    ) {
      if (action.payload.quantity < 1) {
        state.items = state.items.filter((item) => item.id !== action.payload.id);
        return;
      }
      const item = state.items.find((entry) => entry.id === action.payload.id);
      if (item) item.quantity = action.payload.quantity;
    },
  },
});

export const { addCartItem, clearCartItems, removeCartItem, updateCartQuantity } =
  cartSlice.actions;
export default cartSlice.reducer;
