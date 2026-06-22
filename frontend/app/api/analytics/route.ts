import { NextResponse, type NextRequest } from "next/server";
import { getAnalyticsDashboardData } from "@/lib/data/analytics";
import type { AnalyticsRange } from "@/types/analytics";

export const dynamic = "force-dynamic";

const allowedRanges: AnalyticsRange[] = ["today", "7d", "30d", "all"];

export async function GET(request: NextRequest) {
  const requestedRange = request.nextUrl.searchParams.get("range");
  const range = allowedRanges.includes(requestedRange as AnalyticsRange)
    ? (requestedRange as AnalyticsRange)
    : "7d";

  return NextResponse.json({
    data: getAnalyticsDashboardData(range),
  });
}
