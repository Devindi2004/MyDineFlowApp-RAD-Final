import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { InventoryAlert } from "@/types/inventory";

type InventoryState = {
  alerts: InventoryAlert[];
  items: InventoryAlert[];
  loading: boolean;
};

const initialState: InventoryState = {
  alerts: [],
  items: [],
  loading: false,
};

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    setInventoryAlerts(state, action: PayloadAction<InventoryAlert[]>) {
      state.alerts = action.payload;
    },
    setInventoryItems(state, action: PayloadAction<InventoryAlert[]>) {
      state.items = action.payload;
    },
    setInventoryLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setInventoryAlerts, setInventoryItems, setInventoryLoading } =
  inventorySlice.actions;
export default inventorySlice.reducer;
