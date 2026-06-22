import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "@/types/auth";

type AuthState = {
  accessToken: string | null;
  loading: boolean;
  user: AuthUser | null;
};

const initialState: AuthState = {
  accessToken: null,
  loading: false,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthSession(
      state,
      action: PayloadAction<{ accessToken: string | null; user: AuthUser | null }>
    ) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    clearAuthState(state) {
      state.accessToken = null;
      state.user = null;
      state.loading = false;
    },
  },
});

export const { clearAuthState, setAuthLoading, setAuthSession } = authSlice.actions;
export default authSlice.reducer;
