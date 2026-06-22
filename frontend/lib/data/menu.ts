import type { MenuCategory, MenuItem } from "@/types/menu";

export const menuCategories: MenuCategory[] = [
  "All",
  "Signature",
  "Mains",
  "Sri Lankan",
  "Seafood",
  "Desserts",
  "Drinks",
];

export const menuItems: MenuItem[] = [
  {
    id: "df-001",
    name: "Ceylon Pepper Tenderloin",
    description:
      "Chargrilled beef tenderloin with black pepper jus, smoked leeks, and crisp potato terrine.",
    category: "Signature",
    price: 4850,
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85",
    rating: 4.9,
    prepTime: 22,
    calories: 680,
    spiceLevel: "medium",
    tags: ["signature", "high-protein", "chef-pick"],
    orderCount: 284,
    inventoryStatus: "limited",
    recommendationReason: "Guests who ordered premium mains often reorder this.",
  },
  {
    id: "df-002",
    name: "Lagoon Crab Kottu",
    description:
      "Hand-chopped roti, lagoon crab, curry leaf butter, leeks, egg, and roasted chilli sambol.",
    category: "Sri Lankan",
    price: 3250,
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=85",
    rating: 4.8,
    prepTime: 18,
    calories: 740,
    spiceLevel: "hot",
    tags: ["signature", "chef-pick"],
    orderCount: 391,
    inventoryStatus: "in-stock",
    recommendationReason: "Trending tonight with spicy food lovers.",
  },
  {
    id: "df-003",
    name: "Saffron Prawn Risotto",
    description:
      "Arborio rice folded with saffron stock, seared prawns, parmesan, and citrus herb oil.",
    category: "Seafood",
    price: 3950,
    image:
      "https://images.unsplash.com/photo-1476124369491-e7addf5db371?auto=format&fit=crop&w=1200&q=85",
    rating: 4.7,
    prepTime: 20,
    calories: 590,
    spiceLevel: "mild",
    tags: ["gluten-free", "high-protein"],
    orderCount: 211,
    inventoryStatus: "in-stock",
    recommendationReason: "Balanced, rich, and highly rated by seafood guests.",
  },
  {
    id: "df-004",
    name: "Smoked Chicken Bao Trio",
    description:
      "Cloud-soft bao with smoked chicken, pickled cucumber, chilli caramel, and sesame.",
    category: "Mains",
    price: 2450,
    image:
      "https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=1200&q=85",
    rating: 4.7,
    prepTime: 14,
    calories: 520,
    spiceLevel: "medium",
    tags: ["high-protein"],
    orderCount: 336,
    inventoryStatus: "in-stock",
    recommendationReason: "Fast prep and popular with table-sharing orders.",
  },
  {
    id: "df-005",
    name: "Garden Jackfruit Bowl",
    description:
      "Young jackfruit curry, coconut rice, avocado, greens, cashew crumble, and lime pickle.",
    category: "Sri Lankan",
    price: 2150,
    image:
      "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=85",
    rating: 4.6,
    prepTime: 13,
    calories: 480,
    spiceLevel: "medium",
    tags: ["vegan", "vegetarian", "gluten-free"],
    orderCount: 176,
    inventoryStatus: "in-stock",
    recommendationReason: "A lighter local favorite with strong repeat orders.",
  },
  {
    id: "df-006",
    name: "Truffle Mushroom Linguine",
    description:
      "Fresh linguine, wild mushrooms, truffle cream, aged parmesan, and toasted sourdough crumb.",
    category: "Mains",
    price: 2850,
    image:
      "https://images.unsplash.com/photo-1473093226795-af9932fe5856?auto=format&fit=crop&w=1200&q=85",
    rating: 4.8,
    prepTime: 17,
    calories: 620,
    spiceLevel: "mild",
    tags: ["vegetarian", "chef-pick"],
    orderCount: 267,
    inventoryStatus: "in-stock",
    recommendationReason: "Recommended for creamy pasta preferences.",
  },
  {
    id: "df-007",
    name: "Dark Chocolate Fondant",
    description:
      "Single-origin chocolate fondant with vanilla bean ice cream and salted orange caramel.",
    category: "Desserts",
    price: 1550,
    image:
      "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=1200&q=85",
    rating: 4.9,
    prepTime: 11,
    calories: 430,
    spiceLevel: "mild",
    tags: ["signature", "vegetarian"],
    orderCount: 418,
    inventoryStatus: "limited",
    recommendationReason: "Most paired dessert after signature mains.",
  },
  {
    id: "df-008",
    name: "King Coconut Spritz",
    description:
      "King coconut, lime, mint, bitters, and sparkling water over hand-cut ice.",
    category: "Drinks",
    price: 1250,
    image:
      "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=1200&q=85",
    rating: 4.6,
    prepTime: 5,
    calories: 120,
    spiceLevel: "mild",
    tags: ["vegan", "gluten-free"],
    orderCount: 229,
    inventoryStatus: "in-stock",
    recommendationReason: "Pairs well with spicy Sri Lankan dishes.",
  },
];

export const recommendedMenuItems = menuItems
  .filter((item) => item.recommendationReason)
  .sort((a, b) => b.rating + b.orderCount / 1000 - (a.rating + a.orderCount / 1000))
  .slice(0, 4);

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0,
  }).format(amount);
}
