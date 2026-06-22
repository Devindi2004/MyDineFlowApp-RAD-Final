import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/lib/store/authSlice";
import cartReducer from "@/lib/store/cartSlice";
import inventoryReducer from "@/lib/store/inventorySlice";
import menuReducer from "@/lib/store/menuSlice";
import orderReducer from "@/lib/store/orderSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    inventory: inventoryReducer,
    menu: menuReducer,
    orders: orderReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
