import { NextResponse, type NextRequest } from "next/server";
import {
  createDiningTable,
  getDiningTables,
  validateDiningTableInput,
} from "@/lib/data/tables";
import type { CreateDiningTableInput, DiningTableStatus } from "@/types/table";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status") as
    | DiningTableStatus
    | "all"
    | null;

  return NextResponse.json({
    data: getDiningTables(status ?? "all"),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateDiningTableInput;
    const errors = validateDiningTableInput(body);

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          fields: errors,
        },
        { status: 400 }
      );
    }

    const table = createDiningTable({
      ...body,
      capacity: Number(body.capacity),
    });

    return NextResponse.json({ data: table }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to create table." },
      { status: 500 }
    );
  }
}
