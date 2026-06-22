import { NextResponse } from "next/server";
import { clearRefreshCookie, getRefreshTokenFromCookies } from "@/lib/auth/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { verifyRefreshToken } from "@/lib/auth/tokens";
import { UserModel } from "@/lib/models/user";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const refreshToken = await getRefreshTokenFromCookies();

  if (refreshToken) {
    try {
      const payload = verifyRefreshToken(refreshToken);
      await connectToDatabase();
      await UserModel.findByIdAndUpdate(payload.sub, {
        $unset: { refreshTokenHash: "" },
      });
    } catch {
      // Invalid refresh tokens are cleared below without leaking detail.
    }
  }

  clearRefreshCookie(response);

  return response;
}
