import type {
  CreateDiningTableInput,
  DiningTable,
  DiningTableStatus,
  UpdateDiningTableInput,
} from "@/types/table";

const DEFAULT_RESTAURANT_ID = "rest123";
const PUBLIC_MENU_URL =
  process.env.NEXT_PUBLIC_DINEFLOW_URL ?? "https://dineflow.com";

function now() {
  return new Date().toISOString();
}

function normalizeTableNumber(tableNumber: string | number) {
  const numericTable = Number(tableNumber);

  if (Number.isFinite(numericTable) && numericTable > 0) {
    return numericTable.toString().padStart(2, "0");
  }

  return String(tableNumber).trim().toUpperCase();
}

export function createTableQrUrl(
  tableNumber: string,
  restaurantId = DEFAULT_RESTAURANT_ID
) {
  const url = new URL("/menu", PUBLIC_MENU_URL);
  url.searchParams.set("table", String(Number(tableNumber) || tableNumber));
  url.searchParams.set("restaurant", restaurantId);

  return url.toString();
}

const seedTables: DiningTable[] = [
  { tableNumber: "01", capacity: 2, isOccupied: false },
  { tableNumber: "02", capacity: 4, isOccupied: true },
  { tableNumber: "03", capacity: 4, isOccupied: false },
  { tableNumber: "04", capacity: 6, isOccupied: false },
  { tableNumber: "05", capacity: 2, isOccupied: true },
  { tableNumber: "06", capacity: 8, isOccupied: false },
].map((table, index) => {
  const timestamp = now();
  const restaurantId = DEFAULT_RESTAURANT_ID;

  return {
    id: `tbl-${index + 1}`,
    restaurantId,
    tableNumber: table.tableNumber,
    capacity: table.capacity,
    isOccupied: table.isOccupied,
    qrCodeUrl: createTableQrUrl(table.tableNumber, restaurantId),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
});

let fakeTables = [...seedTables];

export function getDiningTables(status?: DiningTableStatus | "all") {
  if (!status || status === "all") {
    return fakeTables;
  }

  return fakeTables.filter((table) =>
    status === "occupied" ? table.isOccupied : !table.isOccupied
  );
}

export function getDiningTable(id: string) {
  return fakeTables.find((table) => table.id === id);
}

export function createDiningTable(input: CreateDiningTableInput) {
  const tableNumber = normalizeTableNumber(input.tableNumber);
  const restaurantId = input.restaurantId?.trim() || DEFAULT_RESTAURANT_ID;

  const table: DiningTable = {
    id: `tbl-${Date.now()}`,
    tableNumber,
    restaurantId,
    capacity: input.capacity,
    isOccupied: Boolean(input.isOccupied),
    qrCodeUrl: createTableQrUrl(tableNumber, restaurantId),
    createdAt: now(),
    updatedAt: now(),
  };

  fakeTables = [table, ...fakeTables];

  return table;
}

export function updateDiningTable(id: string, input: UpdateDiningTableInput) {
  const existingTable = getDiningTable(id);

  if (!existingTable) {
    return null;
  }

  const tableNumber =
    input.tableNumber === undefined
      ? existingTable.tableNumber
      : normalizeTableNumber(input.tableNumber);
  const restaurantId =
    input.restaurantId?.trim() || existingTable.restaurantId;

  const updatedTable: DiningTable = {
    ...existingTable,
    ...input,
    tableNumber,
    restaurantId,
    qrCodeUrl: createTableQrUrl(tableNumber, restaurantId),
    updatedAt: now(),
  };

  fakeTables = fakeTables.map((table) =>
    table.id === id ? updatedTable : table
  );

  return updatedTable;
}

export function deleteDiningTable(id: string) {
  const table = getDiningTable(id);

  if (!table) {
    return null;
  }

  fakeTables = fakeTables.filter((item) => item.id !== id);

  return table;
}

export function validateDiningTableInput(input: Partial<CreateDiningTableInput>) {
  const errors: Record<string, string> = {};

  if (!input.tableNumber || String(input.tableNumber).trim().length === 0) {
    errors.tableNumber = "Table number is required.";
  }

  if (
    input.capacity === undefined ||
    !Number.isFinite(Number(input.capacity)) ||
    Number(input.capacity) < 1
  ) {
    errors.capacity = "Capacity must be at least 1.";
  }

  return errors;
}
