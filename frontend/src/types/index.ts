export type UserRole = 'customer' | 'waiter' | 'chef' | 'staff' | 'kitchen' | 'admin';
export type MenuCategory = 'Signature' | 'Mains' | 'Sri Lankan' | 'Seafood' | 'Desserts' | 'Drinks';
export type SpiceLevel = 'mild' | 'medium' | 'hot';
export type DietaryTag = 'chef-pick' | 'gluten-free' | 'high-protein' | 'signature' | 'vegan' | 'vegetarian';
export type OrderStatus = 'pending' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'payhere';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  restaurantId?: string;
  loyaltyPoints: number;
  isEmailVerified: boolean;
  address?: string;
}

export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  imageUrl: string;
  isAvailable: boolean;
  restaurantId: string;
  spiceLevel: SpiceLevel;
  tags: DietaryTag[];
  prepTime: number;
  calories: number;
  orderCount: number;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export interface OrderItem {
  menuItem: string;
  name: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  restaurantId: string;
  customerId?: string;
  tableId?: string;
  tableNumber: string;
  customerName: string;
  contactNumber: string;
  specialInstructions?: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface StaffUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  restaurantId?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface CartState {
  items: CartItem[];
  restaurantId: string;
  tableNumber: string;
  customerName: string;
}

export interface MenuState {
  items: MenuItem[];
  loading: boolean;
  error: string | null;
  selectedCategory: string;
}

export interface OrderState {
  orders: Order[];
  currentOrder: Order | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
}
