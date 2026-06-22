import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { UserModel, type UserDocument } from "@/lib/models/user";
import {
  authCookieConfig,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "@/lib/auth/tokens";
import type { AuthTokenPayload, AuthUser } from "@/types/auth";

export function toAuthUser(user: UserDocument & { _id: unknown }): AuthUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    role: user.role,
    phone: user.phone,
    address: user.address,
    loyaltyPoints: user.loyaltyPoints,
    restaurantId: user.restaurantId,
  };
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function hashRefreshToken(refreshToken: string) {
  return bcrypt.hash(refreshToken, 12);
}

export async function verifyRefreshTokenHash(
  refreshToken: string,
  refreshTokenHash: string
) {
  return bcrypt.compare(refreshToken, refreshTokenHash);
}

export async function issueAuthTokens(
  user: AuthUser
) {
  const payload: AuthTokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    restaurantId: user.restaurantId,
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  await UserModel.findByIdAndUpdate(user.id, {
    refreshTokenHash: await hashRefreshToken(refreshToken),
  });

  return { accessToken, refreshToken };
}

export function setRefreshCookie(response: NextResponse, refreshToken: string) {
  response.cookies.set(authCookieConfig.refresh.name, refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: authCookieConfig.refresh.maxAge,
  });
}

export function clearRefreshCookie(response: NextResponse) {
  response.cookies.set(authCookieConfig.refresh.name, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length);
}

export async function getCurrentUserFromBearer(request: NextRequest) {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  let payload: AuthTokenPayload;

  try {
    payload = verifyAccessToken(token);
  } catch {
    return null;
  }

  await connectToDatabase();

  const user = await UserModel.findById(payload.sub);

  return user ? toAuthUser(user) : null;
}

export async function getRefreshTokenFromCookies() {
  const cookieStore = await cookies();

  return cookieStore.get(authCookieConfig.refresh.name)?.value ?? null;
}

export async function rotateRefreshToken() {
  const refreshToken = await getRefreshTokenFromCookies();

  if (!refreshToken) {
    return null;
  }

  let payload: AuthTokenPayload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return null;
  }

  await connectToDatabase();

  const user = await UserModel.findById(payload.sub).select("+refreshTokenHash");

  if (
    !user?.refreshTokenHash ||
    !(await verifyRefreshTokenHash(refreshToken, user.refreshTokenHash))
  ) {
    return null;
  }

  const authUser = toAuthUser(user);
  const tokens = await issueAuthTokens(authUser);

  return {
    user: authUser,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}
