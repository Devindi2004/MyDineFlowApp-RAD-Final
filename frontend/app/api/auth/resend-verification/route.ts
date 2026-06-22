import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  canResendVerification,
  getResendCooldownSeconds,
  prepareAndSendVerificationEmail,
} from "@/lib/auth/email-verification";
import { resendVerificationSchema } from "@/lib/auth/validation";
import { UserModel } from "@/lib/models/user";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resendVerificationSchema.safeParse(body);

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

    const user = await UserModel.findOne({ email: parsed.data.email }).select(
      "+emailVerificationLastSentAt"
    );

    if (!user) {
      return NextResponse.json({
        message:
          "If an account exists for this email, a verification message will be sent.",
      });
    }

    if (user.isEmailVerified) {
      return NextResponse.json({
        message: "This email is already verified. You can sign in now.",
      });
    }

    if (!canResendVerification(user.emailVerificationLastSentAt)) {
      return NextResponse.json(
        {
          error: "Please wait before requesting another verification email.",
          cooldownSeconds: getResendCooldownSeconds(
            user.emailVerificationLastSentAt
          ),
        },
        { status: 429 }
      );
    }

    await prepareAndSendVerificationEmail(user);

    return NextResponse.json({
      message: "Verification email sent. Please check your inbox.",
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("MONGODB_URI")
        ? "Database is not configured. Add MONGODB_URI to your environment."
        : "Unable to resend verification email.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
