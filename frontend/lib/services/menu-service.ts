import { api, isApiUnavailable, unwrapApiData } from "@/lib/api";
import { menuItems } from "@/lib/data/menu";
import type { DietaryTag, MenuItem, SpiceLevel } from "@/types/menu";

export async function getMenuItems() {
  try {
    const response = await api.get<unknown>("/menu");
    const payload = unwrapApiData(response.data);
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { items?: unknown[] })?.items)
        ? (payload as { items: unknown[] }).items
        : [];

    return items.map(normalizeMenuItem);
  } catch (error) {
    if (isApiUnavailable(error)) {
      return menuItems;
    }
    return menuItems;
  }
}

function normalizeMenuItem(payload: unknown): MenuItem {
  const record = payload as Record<string, unknown>;
  const fallback = menuItems[0];
  const category = stringValue(record.category) ?? fallback.category;

  return {
    id: stringValue(record.id) ?? stringValue(record._id) ?? cryptoId(),
    name: stringValue(record.name) ?? "Untitled Dish",
    description:
      stringValue(record.description) ??
      "Freshly prepared by the DineFlow kitchen.",
    category: normalizeCategory(category),
    price: numberValue(record.price) ?? 0,
    image:
      stringValue(record.image) ??
      stringValue(record.imageUrl) ??
      stringValue(record.photoUrl) ??
      fallback.image,
    rating: numberValue(record.rating) ?? 4.7,
    prepTime: numberValue(record.prepTime) ?? numberValue(record.estimatedPrepTime) ?? 18,
    calories: numberValue(record.calories) ?? 520,
    spiceLevel: normalizeSpice(stringValue(record.spiceLevel)),
    tags: normalizeTags(record.tags),
    orderCount: numberValue(record.orderCount) ?? numberValue(record.totalOrders) ?? 0,
    inventoryStatus:
      record.isAvailable === false
        ? "sold-out"
        : (stringValue(record.inventoryStatus) as MenuItem["inventoryStatus"]) ??
          "in-stock",
    recommendationReason: stringValue(record.recommendationReason),
  };
}

function normalizeCategory(value: string): MenuItem["category"] {
  const allowed = ["Signature", "Mains", "Sri Lankan", "Seafood", "Desserts", "Drinks"];
  const formatted = value
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

  return allowed.includes(formatted)
    ? (formatted as MenuItem["category"])
    : "Mains";
}

function normalizeSpice(value: string | undefined): SpiceLevel {
  return value === "hot" || value === "medium" || value === "mild"
    ? value
    : "mild";
}

function normalizeTags(value: unknown): DietaryTag[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((tag): tag is DietaryTag =>
    [
      "chef-pick",
      "gluten-free",
      "high-protein",
      "signature",
      "vegan",
      "vegetarian",
    ].includes(String(tag))
  );
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function cryptoId() {
  return `menu-${Math.random().toString(36).slice(2, 10)}`;
}
