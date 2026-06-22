import { NextResponse, type NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db/mongoose";
import { verifyEmailToken } from "@/lib/auth/email-verification";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const redirectUrl = new URL("/verify-email", request.url);

  if (!token) {
    redirectUrl.searchParams.set("status", "missing");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    await connectToDatabase();

    const user = await verifyEmailToken(token);

    redirectUrl.searchParams.set("status", user ? "success" : "invalid");

    if (user) {
      redirectUrl.searchParams.set("email", user.email);
    }

    return NextResponse.redirect(redirectUrl);
  } catch {
    redirectUrl.searchParams.set("status", "error");
    return NextResponse.redirect(redirectUrl);
  }
}
