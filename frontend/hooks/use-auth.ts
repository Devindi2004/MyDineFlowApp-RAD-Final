"use client";

import { create } from "zustand";
import {
  api,
  clearAuthSession,
  getAccessToken,
  getApiErrorMessage,
  getPersistedAuthUser,
  normalizeAuthResponse,
  normalizeAuthUser,
  persistAuthUser,
  refreshAccessToken,
  setAccessToken,
  setRefreshToken,
  setSessionExpiredHandler,
  unwrapApiData,
} from "@/lib/api";
import { clearAuthState, setAuthLoading, setAuthSession } from "@/lib/store/authSlice";
import { store } from "@/lib/store";
import type { AuthResponse, AuthUser, UserRole } from "@/types/auth";

type AuthCredentials = {
  email: string;
  password: string;
};

type RegisterCredentials = AuthCredentials & {
  name: string;
  phone?: string;
  role: UserRole;
  restaurantId?: string;
};

type AuthState = {
  accessToken: string | null;
  error: string | null;
  hydrated: boolean;
  loading: boolean;
  user: AuthUser | null;
  hydrate: () => Promise<AuthUser | null>;
  login: (credentials: AuthCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<AuthResponse>;
};

export const useAuthStore = create<AuthState>((set) => {
  setSessionExpiredHandler(() => {
    store.dispatch(clearAuthState());
    set({
      accessToken: null,
      error: "Your session expired. Please sign in again.",
      hydrated: true,
      loading: false,
      user: null,
    });
  });

  return {
    accessToken: null,
    error: null,
    hydrated: false,
    loading: false,
    user: null,

    hydrate: async () => {
      const persistedToken = getAccessToken();
      const persistedUser = getPersistedAuthUser();

      if (persistedToken && persistedUser) {
        set({
          accessToken: persistedToken,
          hydrated: true,
          loading: false,
          user: persistedUser,
        });
      }

      if (!persistedToken) {
        set({
          accessToken: null,
          hydrated: true,
          loading: false,
          user: null,
        });
        return null;
      }

      set({ loading: true, error: null });
      store.dispatch(setAuthLoading(true));

      try {
        const response = await api.get<unknown>("/auth/me");
        const data = unwrapApiData(response.data) as
          | { user?: unknown }
          | Record<string, unknown>;
        const user = normalizeAuthUser("user" in data ? data.user : data) ?? persistedUser;

        set({
          accessToken: persistedToken,
          hydrated: true,
          loading: false,
          user,
        });

        if (user) {
          persistAuthUser(user);
        }
        store.dispatch(setAuthSession({ accessToken: persistedToken, user: user ?? null }));

        return user ?? null;
      } catch {
        try {
          const payload = await refreshAccessToken();
          set({
            accessToken: payload.accessToken ?? null,
            hydrated: true,
            loading: false,
            user: payload.user ?? persistedUser,
          });
          store.dispatch(
            setAuthSession({
              accessToken: payload.accessToken ?? null,
              user: payload.user ?? persistedUser ?? null,
            })
          );

          return payload.user ?? persistedUser ?? null;
        } catch {
          clearAuthSession();
        }

        set({
          accessToken: null,
          hydrated: true,
          loading: false,
          user: null,
        });
        store.dispatch(clearAuthState());

        return null;
      }
    },

    login: async (credentials) => {
      set({ loading: true, error: null });
      store.dispatch(setAuthLoading(true));

      try {
        const response = await api.post<unknown>("/auth/login", credentials);
        const payload = normalizeAuthResponse(response.data);

        if (!payload.accessToken || !payload.user) {
          throw new Error("Login response was missing authentication data.");
        }

        setAccessToken(payload.accessToken);
        setRefreshToken(payload.refreshToken ?? null);
        persistAuthUser(payload.user);
        set({
          accessToken: payload.accessToken,
          hydrated: true,
          loading: false,
          user: payload.user,
        });
        store.dispatch(
          setAuthSession({ accessToken: payload.accessToken, user: payload.user })
        );

        return payload;
      } catch (error) {
        const message = getApiErrorMessage(error, "Unable to login.");
        clearAuthSession();
        store.dispatch(clearAuthState());
        set({ accessToken: null, error: message, loading: false, user: null });
        throw new Error(message);
      }
    },

    logout: async () => {
      set({ loading: true, error: null });
      store.dispatch(setAuthLoading(true));

      try {
        await api.post("/auth/logout");
      } finally {
        clearAuthSession();
        store.dispatch(clearAuthState());
        set({
          accessToken: null,
          hydrated: true,
          loading: false,
          user: null,
        });
      }
    },

    register: async (credentials) => {
      set({ loading: true, error: null });
      store.dispatch(setAuthLoading(true));

      try {
        const response = await api.post<unknown>("/auth/register", credentials);
        const payload = normalizeAuthResponse(response.data);

        setAccessToken(payload.accessToken ?? null);
        setRefreshToken(payload.refreshToken ?? null);
        persistAuthUser(payload.user ?? null);
        set({
          accessToken: payload.accessToken ?? null,
          hydrated: true,
          loading: false,
          user: payload.user ?? null,
        });
        store.dispatch(
          setAuthSession({
            accessToken: payload.accessToken ?? null,
            user: payload.user ?? null,
          })
        );

        return payload;
      } catch (error) {
        const message = getApiErrorMessage(error, "Unable to register.");
        clearAuthSession();
        store.dispatch(clearAuthState());
        set({ accessToken: null, error: message, loading: false, user: null });
        throw new Error(message);
      }
    },
  };
});

export async function authFetch<T>(url: string) {
  const response = await api.get<T>(url);

  return response.data;
}

export function useAuth() {
  return useAuthStore();
}
