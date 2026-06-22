export type InventoryAlert = {
  id: string;
  item: string;
  currentStock: number;
  unit: string;
  threshold: number;
  severity: "low" | "critical";
};
