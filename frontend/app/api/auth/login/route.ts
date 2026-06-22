import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getRoleRedirect } from "@/lib/auth/roles";
import {
  issueAuthTokens,
  setRefreshCookie,
  toAuthUser,
  verifyPassword,
} from "@/lib/auth/server";
import { loginSchema } from "@/lib/auth/validation";
import { UserModel } from "@/lib/models/user";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ email: parsed.data.email })
      .select("+password")
      .select("+emailVerificationToken +emailVerificationExpires");

    if (!user || !(await verifyPassword(parsed.data.password, user.password))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!user.isEmailVerified) {
      return NextResponse.json(
        {
          error:
            "Please verify your email before signing in. Check your inbox or resend the verification email.",
          emailVerificationRequired: true,
          redirectTo: `/check-email?email=${encodeURIComponent(user.email)}`,
        },
        { status: 403 }
      );
    }

    const authUser = toAuthUser(user);
    const { accessToken, refreshToken } = await issueAuthTokens(authUser);
    const response = NextResponse.json({
      accessToken,
      user: authUser,
      redirectTo: getRoleRedirect(authUser.role),
    });

    setRefreshCookie(response, refreshToken);

    return response;
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("MONGODB_URI")
        ? "Database is not configured. Add MONGODB_URI to your environment."
        : "Unable to login.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
