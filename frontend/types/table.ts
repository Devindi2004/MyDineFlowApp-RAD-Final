export type DiningTableStatus = "available" | "occupied";

export type DiningTable = {
  id: string;
  tableNumber: string;
  capacity: number;
  isOccupied: boolean;
  restaurantId: string;
  qrCodeUrl: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateDiningTableInput = {
  tableNumber: string;
  capacity: number;
  isOccupied?: boolean;
  restaurantId?: string;
};

export type UpdateDiningTableInput = Partial<CreateDiningTableInput>;
