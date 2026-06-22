import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CustomerOrder } from "@/types/order";

type OrderState = {
  orders: CustomerOrder[];
  loading: boolean;
};

const initialState: OrderState = {
  orders: [],
  loading: false,
};

const orderSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    setOrders(state, action: PayloadAction<CustomerOrder[]>) {
      state.orders = action.payload;
    },
    upsertOrder(state, action: PayloadAction<CustomerOrder>) {
      const index = state.orders.findIndex((order) => order.id === action.payload.id);
      if (index >= 0) state.orders[index] = action.payload;
      else state.orders.unshift(action.payload);
    },
    setOrdersLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setOrders, setOrdersLoading, upsertOrder } = orderSlice.actions;
export default orderSlice.reducer;
