import { NextResponse, type NextRequest } from "next/server";
import {
  deleteDiningTable,
  getDiningTable,
  updateDiningTable,
  validateDiningTableInput,
} from "@/lib/data/tables";
import type { UpdateDiningTableInput } from "@/types/table";

export const dynamic = "force-dynamic";

type TableRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, context: TableRouteContext) {
  const { id } = await context.params;
  const table = getDiningTable(id);

  if (!table) {
    return NextResponse.json({ error: "Table not found." }, { status: 404 });
  }

  return NextResponse.json({ data: table });
}

export async function PATCH(request: NextRequest, context: TableRouteContext) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateDiningTableInput;
    const errors =
      body.tableNumber !== undefined || body.capacity !== undefined
        ? validateDiningTableInput({
            tableNumber: body.tableNumber ?? "existing",
            capacity: body.capacity ?? 1,
          })
        : {};

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed.",
          fields: errors,
        },
        { status: 400 }
      );
    }

    const table = updateDiningTable(id, {
      ...body,
      capacity:
        body.capacity === undefined ? undefined : Number(body.capacity),
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found." }, { status: 404 });
    }

    return NextResponse.json({ data: table });
  } catch {
    return NextResponse.json(
      { error: "Unable to update table." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: TableRouteContext
) {
  const { id } = await context.params;
  const table = deleteDiningTable(id);

  if (!table) {
    return NextResponse.json({ error: "Table not found." }, { status: 404 });
  }

  return NextResponse.json({ data: table });
}
