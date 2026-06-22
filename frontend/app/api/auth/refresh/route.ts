import { NextResponse } from "next/server";
import { getRoleRedirect } from "@/lib/auth/roles";
import {
  clearRefreshCookie,
  rotateRefreshToken,
  setRefreshCookie,
} from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await rotateRefreshToken();

    if (!session) {
      const response = NextResponse.json(
        { error: "Refresh token expired or revoked." },
        { status: 401 }
      );
      clearRefreshCookie(response);

      return response;
    }

    const response = NextResponse.json({
      accessToken: session.accessToken,
      user: session.user,
      redirectTo: getRoleRedirect(session.user.role),
    });
    setRefreshCookie(response, session.refreshToken);

    return response;
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("MONGODB_URI")
        ? "Database is not configured. Add MONGODB_URI to your environment."
        : "Unable to refresh session.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
