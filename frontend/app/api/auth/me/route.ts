import { NextResponse, type NextRequest } from "next/server";
import { getRoleRedirect } from "@/lib/auth/roles";
import { getCurrentUserFromBearer } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromBearer(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated." }, { status: 401 });
    }

    return NextResponse.json({
      accessToken: "",
      user,
      redirectTo: getRoleRedirect(user.role),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("MONGODB_URI")
        ? "Database is not configured. Add MONGODB_URI to your environment."
        : "Unable to load current user.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
