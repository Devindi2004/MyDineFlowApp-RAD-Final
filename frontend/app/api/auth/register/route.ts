import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { prepareAndSendVerificationEmail } from "@/lib/auth/email-verification";
import { hashPassword } from "@/lib/auth/server";
import { registerSchema } from "@/lib/auth/validation";
import { UserModel } from "@/lib/models/user";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

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

    const existingUser = await UserModel.findOne({
      email: parsed.data.email,
    }).lean();

    if (existingUser) {
      return NextResponse.json(
        { error: "An account already exists for this email." },
        { status: 409 }
      );
    }

    const user = await UserModel.create({
      ...parsed.data,
      restaurantId:
        parsed.data.role === "customer"
          ? undefined
          : parsed.data.restaurantId || "rest123",
      password: await hashPassword(parsed.data.password),
      isEmailVerified: false,
      loyaltyPoints: 0,
    });

    await prepareAndSendVerificationEmail(user);

    return NextResponse.json(
      {
        emailVerificationRequired: true,
        message:
          "Account created. Please check your email to verify your DineFlow account.",
        redirectTo: `/check-email?email=${encodeURIComponent(user.email)}`,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("MONGODB_URI")
        ? "Database is not configured. Add MONGODB_URI to your environment."
        : "Unable to register user.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
