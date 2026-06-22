import { api, isApiUnavailable, unwrapApiData } from "@/lib/api";
import { mockInventoryAlerts } from "@/lib/data/inventory";
import type { InventoryAlert } from "@/types/inventory";

export async function getInventoryAlerts() {
  try {
    const response = await api.get<unknown>("/inventory/alerts");
    const payload = unwrapApiData(response.data);
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { items?: unknown[] })?.items)
        ? (payload as { items: unknown[] }).items
        : [];
    return items.length > 0 ? items.map(normalizeInventoryAlert) : mockInventoryAlerts;
  } catch (error) {
    if (isApiUnavailable(error)) {
      return mockInventoryAlerts;
    }
    return mockInventoryAlerts;
  }
}

function normalizeInventoryAlert(payload: unknown): InventoryAlert {
  const record = payload as Record<string, unknown>;
  const currentStock = numberValue(record.stock) || numberValue(record.currentStock);
  const threshold = numberValue(record.threshold);

  return {
    id: stringValue(record.id) ?? stringValue(record._id) ?? cryptoId(),
    item:
      stringValue(record.item) ??
      stringValue(record.itemName) ??
      stringValue(record.name) ??
      "Inventory item",
    currentStock,
    threshold,
    unit: stringValue(record.unit) ?? "units",
    severity: currentStock <= Math.max(1, threshold / 2) ? "critical" : "low",
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function cryptoId() {
  return `inv-${Math.random().toString(36).slice(2, 10)}`;
}
