import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db";
import { MenuItem } from "../models/MenuItem";
import { Restaurant } from "../models/Restaurant";
import { User } from "../models/User";

const menuItemsData = [
  {
    name: "Rice & Curry Platter",
    description: "Authentic Sri Lankan rice with dhal, chicken curry, pol sambol, and papadum.",
    price: 950,
    category: "Sri Lankan",
    imageUrl: "/images/menu/rice-curry.jpg",
    spiceLevel: "medium",
    tags: ["chef-pick"],
    prepTime: 15,
    calories: 720,
    orderCount: 456,
  },
  {
    name: "Kottu Roti",
    description: "Sri Lanka's favourite street food with shredded roti, vegetables, egg, and spices.",
    price: 850,
    category: "Sri Lankan",
    imageUrl: "/images/menu/kottu-roti.jpg",
    spiceLevel: "medium",
    tags: ["signature"],
    prepTime: 12,
    calories: 650,
    orderCount: 389,
  },
  {
    name: "Lamprais",
    description: "Dutch-Burgher classic with rice, curries, and accompaniments baked in banana leaf.",
    price: 1200,
    category: "Sri Lankan",
    imageUrl: "/images/menu/lamprais.jpg",
    spiceLevel: "medium",
    tags: ["signature"],
    prepTime: 30,
    calories: 890,
    orderCount: 134,
  },
  {
    name: "Mango Lassi",
    description: "Creamy yogurt blended with fresh mango and a pinch of cardamom.",
    price: 420,
    category: "Drinks",
    imageUrl: "/images/menu/mango-lassi.jpg",
    spiceLevel: "mild",
    tags: ["vegetarian"],
    prepTime: 5,
    calories: 180,
    orderCount: 367,
  },
  {
    name: "Fresh Lime Soda",
    description: "Freshly squeezed lime with sparkling water, mint, and ginger.",
    price: 350,
    category: "Drinks",
    imageUrl: "/images/menu/lime-soda.jpg",
    spiceLevel: "mild",
    tags: ["vegan", "gluten-free"],
    prepTime: 3,
    calories: 45,
    orderCount: 512,
  },
  {
    name: "King Coconut Water",
    description: "Fresh Sri Lankan king coconut served chilled.",
    price: 280,
    category: "Drinks",
    imageUrl: "/images/menu/coconut-water.jpg",
    spiceLevel: "mild",
    tags: ["vegan", "gluten-free"],
    prepTime: 2,
    calories: 60,
    orderCount: 445,
  },
  {
    name: "Chocolate Lava Cake",
    description: "Warm dark chocolate cake with a molten centre and vanilla ice cream.",
    price: 750,
    category: "Desserts",
    imageUrl: "/images/menu/lava-cake.jpg",
    spiceLevel: "mild",
    tags: ["vegetarian"],
    prepTime: 12,
    calories: 480,
    orderCount: 334,
  },
  {
    name: "Watalappan",
    description: "Traditional Sri Lankan coconut custard pudding with jaggery and cashews.",
    price: 550,
    category: "Desserts",
    imageUrl: "/images/menu/watalappan.jpg",
    spiceLevel: "mild",
    tags: ["vegetarian", "signature"],
    prepTime: 8,
    calories: 320,
    orderCount: 289,
  },
  {
    name: "Grilled Chicken Breast",
    description: "Herb-marinated chicken breast with roasted vegetables and lemon butter sauce.",
    price: 1650,
    category: "Mains",
    imageUrl: "/images/menu/grilled-chicken.jpg",
    spiceLevel: "mild",
    tags: ["high-protein", "gluten-free"],
    prepTime: 18,
    calories: 520,
    orderCount: 312,
  },
  {
    name: "Grilled Prawns",
    description: "Tiger prawns marinated in garlic butter and herbs, served with lemon aioli.",
    price: 2800,
    category: "Seafood",
    imageUrl: "/images/menu/grilled-prawns.jpg",
    spiceLevel: "mild",
    tags: ["gluten-free", "high-protein"],
    prepTime: 20,
    calories: 380,
    orderCount: 201,
  },
] as const;

async function ensureDemoData(): Promise<void> {
  await connectDB();

  let admin = await User.findOne({ email: "admin@example.com" });
  if (!admin) {
    admin = await User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: await bcrypt.hash("Admin@123", 12),
      role: "admin",
      isEmailVerified: true,
    });
  }

  let restaurant = await Restaurant.findOne();
  if (!restaurant) {
    restaurant = await Restaurant.create({
      name: "DineFlow Restaurant",
      address: "123 Galle Road, Colombo 03, Sri Lanka",
      phone: "+94 11 234 5678",
      ownerId: admin._id,
    });
  }

  await User.updateMany(
    { $or: [{ restaurantId: { $exists: false } }, { restaurantId: null }] },
    { restaurantId: restaurant._id }
  );

  for (const item of menuItemsData) {
    await MenuItem.findOneAndUpdate(
      { name: item.name, restaurantId: restaurant._id },
      { ...item, restaurantId: restaurant._id, isAvailable: true },
      { upsert: true, new: true, runValidators: true }
    );
  }

  const counts = {
    restaurants: await Restaurant.countDocuments(),
    menuItems: await MenuItem.countDocuments(),
    availableMenuItems: await MenuItem.countDocuments({ isAvailable: true }),
  };

  console.log("Demo data ready:", counts);
  console.log(`Restaurant ID: ${restaurant._id}`);

  await mongoose.disconnect();
}

ensureDemoData().catch((err) => {
  console.error("Demo data seed failed:", err);
  process.exit(1);
});
