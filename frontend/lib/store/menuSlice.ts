import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MenuItem } from "@/types/menu";

type MenuState = {
  items: MenuItem[];
  loading: boolean;
};

const initialState: MenuState = {
  items: [],
  loading: false,
};

const menuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {
    setMenuItems(state, action: PayloadAction<MenuItem[]>) {
      state.items = action.payload;
    },
    setMenuLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
  },
});

export const { setMenuItems, setMenuLoading } = menuSlice.actions;
export default menuSlice.reducer;
