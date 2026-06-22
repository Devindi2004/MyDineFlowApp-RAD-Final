import type { InventoryAlert } from "@/types/inventory";

export const mockInventoryAlerts: InventoryAlert[] = [
  {
    id: "inv-001",
    item: "Lagoon crab",
    currentStock: 4,
    unit: "kg",
    threshold: 8,
    severity: "critical",
  },
  {
    id: "inv-002",
    item: "King coconut",
    currentStock: 18,
    unit: "units",
    threshold: 30,
    severity: "low",
  },
  {
    id: "inv-003",
    item: "Beef tenderloin",
    currentStock: 6,
    unit: "portions",
    threshold: 12,
    severity: "low",
  },
];
