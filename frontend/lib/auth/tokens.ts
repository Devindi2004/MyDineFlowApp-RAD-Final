import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "@/types/auth";

const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 15;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function getJwtSecret(kind: "access" | "refresh") {
  const secret =
    kind === "access" ? process.env.JWT_SECRET : process.env.JWT_REFRESH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      kind === "access"
        ? "JWT_SECRET is not configured."
        : "JWT_REFRESH_SECRET is not configured."
    );
  }

  return kind === "access"
    ? "development-access-secret-change-before-production"
    : "development-refresh-secret-change-before-production";
}

export function signAccessToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getJwtSecret("access"), {
    algorithm: "HS256",
    expiresIn: ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
}

export function signRefreshToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getJwtSecret("refresh"), {
    algorithm: "HS256",
    expiresIn: REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, getJwtSecret("access")) as AuthTokenPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, getJwtSecret("refresh")) as AuthTokenPayload;
}

export const authCookieConfig = {
  refresh: {
    name: "dineflow_refresh",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  },
} as const;

export { ACCESS_TOKEN_MAX_AGE_SECONDS, REFRESH_TOKEN_MAX_AGE_SECONDS };
