import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db";
import { User } from "../models/User";
import { Restaurant } from "../models/Restaurant";
import { Table } from "../models/Table";
import { MenuItem } from "../models/MenuItem";
import { Inventory } from "../models/Inventory";
import { Order } from "../models/Order";
import { Payment } from "../models/Payment";
import { Reservation } from "../models/Reservation";
import { Review } from "../models/Review";

async function seed(): Promise<void> {
  await connectDB();
  console.log("Connected to MongoDB. Starting seed...");

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Restaurant.deleteMany({}),
    Table.deleteMany({}),
    MenuItem.deleteMany({}),
    Inventory.deleteMany({}),
    Order.deleteMany({}),
    Payment.deleteMany({}),
    Reservation.deleteMany({}),
    Review.deleteMany({}),
  ]);
  console.log("Cleared existing data.");

  // Create users
  const [adminUser, chefUser, waiterUser, customerUser] = await Promise.all([
    User.create({
      name: "Admin User",
      email: "admin@example.com",
      password: await bcrypt.hash("Admin@123", 12),
      role: "admin",
      isEmailVerified: true,
      loyaltyPoints: 0,
    }),
    User.create({
      name: "Kitchen Staff",
      email: "chef@example.com",
      password: await bcrypt.hash("Chef@123", 12),
      role: "chef",
      isEmailVerified: true,
      loyaltyPoints: 0,
    }),
    User.create({
      name: "Demo Waiter",
      email: "waiter@example.com",
      password: await bcrypt.hash("Waiter@123", 12),
      role: "waiter",
      isEmailVerified: true,
      loyaltyPoints: 0,
    }),
    User.create({
      name: "Demo Customer",
      email: "customer@example.com",
      password: await bcrypt.hash("Customer@123", 12),
      role: "customer",
      isEmailVerified: true,
      loyaltyPoints: 120,
    }),
  ]);
  console.log("Created users.");

  // Create restaurant
  const restaurant = await Restaurant.create({
    name: "DineFlow Restaurant",
    address: "123 Galle Road, Colombo 03, Sri Lanka",
    phone: "+94 11 234 5678",
    ownerId: adminUser._id,
  });
  console.log("Created restaurant.");

  // Update staff with restaurantId
  await Promise.all([
    User.findByIdAndUpdate(adminUser._id, { restaurantId: restaurant._id }),
    User.findByIdAndUpdate(chefUser._id, { restaurantId: restaurant._id }),
    User.findByIdAndUpdate(waiterUser._id, { restaurantId: restaurant._id }),
  ]);

  console.log("Skipped sample tables. Add tables from the admin dashboard.");

  // Create menu items
  const menuItemsData = [
    // Signature
    {
      name: "DineFlow Signature Burger",
      description: "Our legendary double-patty burger with caramelized onions, aged cheddar, and secret sauce.",
      price: 1850,
      category: "Signature",
      imageUrl: "/images/menu/signature-burger.jpg",
      spiceLevel: "mild",
      tags: ["chef-pick", "signature"],
      prepTime: 20,
      calories: 780,
      orderCount: 245,
    },
    {
      name: "Truffle Mushroom Risotto",
      description: "Creamy Arborio rice with wild mushrooms, truffle oil, and Parmesan shavings.",
      price: 2200,
      category: "Signature",
      imageUrl: "/images/menu/truffle-risotto.jpg",
      spiceLevel: "mild",
      tags: ["chef-pick", "vegetarian"],
      prepTime: 25,
      calories: 620,
      orderCount: 189,
    },
    // Mains
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
      name: "Beef Tenderloin Steak",
      description: "200g prime beef tenderloin, cooked to your preference with garlic mashed potatoes.",
      price: 3200,
      category: "Mains",
      imageUrl: "/images/menu/beef-steak.jpg",
      spiceLevel: "mild",
      tags: ["high-protein"],
      prepTime: 25,
      calories: 850,
      orderCount: 178,
    },
    {
      name: "Pasta Carbonara",
      description: "Classic Italian pasta with crispy pancetta, egg yolk, Pecorino Romano, and black pepper.",
      price: 1450,
      category: "Mains",
      imageUrl: "/images/menu/pasta-carbonara.jpg",
      spiceLevel: "mild",
      tags: [],
      prepTime: 15,
      calories: 680,
      orderCount: 267,
    },
    // Sri Lankan
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
      description: "Sri Lanka's favourite street food — shredded roti stir-fried with vegetables, egg, and spices.",
      price: 850,
      category: "Sri Lankan",
      imageUrl: "/images/menu/kottu-roti.jpg",
      spiceLevel: "medium",
      tags: [],
      prepTime: 12,
      calories: 650,
      orderCount: 389,
    },
    {
      name: "Lamprais",
      description: "Dutch-Burgher classic: rice, curries, and accompaniments wrapped and baked in banana leaf.",
      price: 1200,
      category: "Sri Lankan",
      imageUrl: "/images/menu/lamprais.jpg",
      spiceLevel: "medium",
      tags: ["signature"],
      prepTime: 30,
      calories: 890,
      orderCount: 134,
    },
    // Seafood
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
    {
      name: "Fish & Chips",
      description: "Beer-battered fresh fish fillet with crispy chips, tartar sauce, and mushy peas.",
      price: 1750,
      category: "Seafood",
      imageUrl: "/images/menu/fish-chips.jpg",
      spiceLevel: "mild",
      tags: [],
      prepTime: 18,
      calories: 720,
      orderCount: 223,
    },
    // Desserts
    {
      name: "Chocolate Lava Cake",
      description: "Warm dark chocolate cake with a molten centre, served with vanilla ice cream.",
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
    // Drinks
    {
      name: "Fresh Lime Soda",
      description: "Freshly squeezed lime with sparkling water, mint, and a hint of ginger.",
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
      description: "Fresh Sri Lankan king coconut, served chilled with a straw.",
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
      name: "Mango Lassi",
      description: "Creamy yogurt blended with fresh Alphonso mango and a pinch of cardamom.",
      price: 420,
      category: "Drinks",
      imageUrl: "/images/menu/mango-lassi.jpg",
      spiceLevel: "mild",
      tags: ["vegetarian"],
      prepTime: 5,
      calories: 180,
      orderCount: 367,
    },
  ];

  console.log("Skipped sample menu items. Add menu items from the admin dashboard.");

  // Create inventory
  const inventoryData = [
    { itemName: "Chicken Breast", quantity: 15, unit: "kg", lowStockLimit: 5 },
    { itemName: "Beef Tenderloin", quantity: 8, unit: "kg", lowStockLimit: 3 },
    { itemName: "Tiger Prawns", quantity: 4, unit: "kg", lowStockLimit: 2 },
    { itemName: "Basmati Rice", quantity: 50, unit: "kg", lowStockLimit: 10 },
    { itemName: "Coconut Milk", quantity: 30, unit: "cans", lowStockLimit: 10 },
    { itemName: "Truffle Oil", quantity: 2, unit: "bottles", lowStockLimit: 1 },
    { itemName: "Arborio Rice", quantity: 5, unit: "kg", lowStockLimit: 2 },
    { itemName: "Dark Chocolate", quantity: 3, unit: "kg", lowStockLimit: 1 },
    { itemName: "Fresh Lime", quantity: 8, unit: "kg", lowStockLimit: 3 },
    { itemName: "King Coconut", quantity: 25, unit: "units", lowStockLimit: 10 },
    { itemName: "Mango", quantity: 6, unit: "kg", lowStockLimit: 3 },
    { itemName: "Pasta", quantity: 12, unit: "kg", lowStockLimit: 4 },
    { itemName: "Parmesan Cheese", quantity: 2, unit: "kg", lowStockLimit: 1 },
    { itemName: "Vanilla Ice Cream", quantity: 4, unit: "litres", lowStockLimit: 2 },
    { itemName: "Jaggery", quantity: 3, unit: "kg", lowStockLimit: 1 },
  ];

  await Inventory.insertMany(
    inventoryData.map((item) => ({ ...item, restaurantId: restaurant._id }))
  );
  console.log("Created inventory.");

  console.log("Skipped sample orders because menu items are admin-managed.");
  console.log("Skipped sample payments because sample orders are disabled.");
  console.log("Skipped sample reservations because tables are admin-managed.");
  console.log("Skipped sample reviews because sample orders are disabled.");

  console.log("\n✅ Seed completed successfully!\n");
  console.log("Demo credentials:");
  console.log("  Admin:    admin@example.com    / Admin@123");
  console.log("  Chef:     chef@example.com     / Chef@123");
  console.log("  Waiter:   waiter@example.com   / Waiter@123");
  console.log("  Customer: customer@example.com / Customer@123");
  console.log(`\nRestaurant ID: ${restaurant._id}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
