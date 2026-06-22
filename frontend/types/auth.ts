export type UserRole = "customer" | "waiter" | "chef" | "kitchen" | "admin";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  isEmailVerified: boolean;
  role: UserRole;
  phone?: string;
  address?: string;
  loyaltyPoints: number;
  restaurantId?: string;
};

export type AuthResponse = {
  accessToken?: string;
  refreshToken?: string;
  emailVerificationRequired?: boolean;
  message?: string;
  redirectTo?: string;
  user?: AuthUser;
};

export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
  restaurantId?: string;
};
