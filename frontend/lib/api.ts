import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { AuthResponse, AuthUser } from "@/types/auth";

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  success?: boolean;
};

const ACCESS_TOKEN_KEY = "dineflow_access_token";
const REFRESH_TOKEN_KEY = "dineflow_refresh_token";
const USER_KEY = "dineflow_user";
const ROLE_COOKIE = "dineflow_role";

let accessToken: string | null = null;
let sessionExpiredHandler: (() => void) | null = null;
let refreshPromise: Promise<AuthResponse> | null = null;

export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://localhost:5000/api/v1",
  withCredentials: true,
  timeout: 10000,
});

export function setAccessToken(token: string | null) {
  accessToken = token;

  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getAccessToken() {
  if (!accessToken && typeof window !== "undefined") {
    accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  return accessToken;
}

export function setRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function persistAuthUser(user: AuthUser | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (user) {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    document.cookie = `${ROLE_COOKIE}=${encodeURIComponent(user.role)}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    window.localStorage.removeItem(USER_KEY);
    document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function getPersistedAuthUser() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawUser = window.localStorage.getItem(USER_KEY);
    return rawUser ? (JSON.parse(rawUser) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function clearAuthSession() {
  setAccessToken(null);
  setRefreshToken(null);
  persistAuthUser(null);
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  sessionExpiredHandler = handler;
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("Refresh token is missing.");
  }

  refreshPromise ??= api
    .post<unknown>("/auth/refresh", { refreshToken })
    .then((response) => normalizeAuthResponse(response.data))
    .then((payload) => {
      if (!payload.accessToken) {
        throw new Error("Refresh response was missing an access token.");
      }

      setAccessToken(payload.accessToken);
      setRefreshToken(payload.refreshToken ?? refreshToken);

      if (payload.user) {
        persistAuthUser(payload.user);
      }

      return payload;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export function unwrapApiData<T>(payload: T | ApiEnvelope<T>) {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    (payload as ApiEnvelope<T>).data !== undefined
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}

export function normalizeAuthResponse(payload: unknown): AuthResponse {
  const value = unwrapApiData(payload as AuthResponse | ApiEnvelope<AuthResponse>);
  const record = (value ?? {}) as Record<string, unknown>;
  const user = normalizeAuthUser(
    (record.user ?? record.data ?? record.profile) as Record<string, unknown> | undefined
  );
  const accessToken =
    stringValue(record.accessToken) ??
    stringValue(record.token) ??
    stringValue(record.jwt);
  const refreshToken = stringValue(record.refreshToken);

  return {
    accessToken,
    refreshToken,
    emailVerificationRequired: Boolean(record.emailVerificationRequired),
    message: stringValue(record.message),
    redirectTo: stringValue(record.redirectTo),
    user,
  };
}

export function normalizeAuthUser(payload: unknown): AuthUser | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;
  const role = stringValue(record.role) ?? "customer";

  return {
    id:
      stringValue(record.id) ??
      stringValue(record._id) ??
      stringValue(record.userId) ??
      "",
    name: stringValue(record.name) ?? "DineFlow User",
    email: stringValue(record.email) ?? "",
    isEmailVerified: Boolean(record.isEmailVerified ?? record.emailVerified ?? true),
    role: role as AuthUser["role"],
    phone: stringValue(record.phone),
    address: stringValue(record.address),
    loyaltyPoints: numberValue(record.loyaltyPoints) ?? 0,
    restaurantId: stringValue(record.restaurantId),
  };
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    return payload?.message ?? payload?.error ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

export function isApiUnavailable(error: unknown) {
  return axios.isAxiosError(error) && !error.response;
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await refreshAccessToken();
      return api(originalRequest);
    } catch (refreshError) {
      clearAuthSession();
      sessionExpiredHandler?.();
      return Promise.reject(refreshError);
    }
  }
);

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}
