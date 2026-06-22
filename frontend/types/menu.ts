export type SpiceLevel = "mild" | "medium" | "hot";

export type DietaryTag =
  | "chef-pick"
  | "gluten-free"
  | "high-protein"
  | "signature"
  | "vegan"
  | "vegetarian";

export type MenuCategory =
  | "All"
  | "Signature"
  | "Mains"
  | "Sri Lankan"
  | "Seafood"
  | "Desserts"
  | "Drinks";

export type MenuItem = {
  id: string;
  name: string;
  description: string;
  category: Exclude<MenuCategory, "All">;
  price: number;
  image: string;
  rating: number;
  prepTime: number;
  calories: number;
  spiceLevel: SpiceLevel;
  tags: DietaryTag[];
  orderCount: number;
  inventoryStatus: "in-stock" | "limited" | "sold-out";
  recommendationReason?: string;
};

export type CartItem = MenuItem & {
  quantity: number;
  notes?: string;
};
