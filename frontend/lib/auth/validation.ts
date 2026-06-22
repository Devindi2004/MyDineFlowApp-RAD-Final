import { z } from "zod";

export const userRoleSchema = z.enum(["customer", "waiter", "chef", "admin"]);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Za-z]/, "Password must include a letter.")
    .regex(/\d/, "Password must include a number."),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
  role: userRoleSchema.default("customer"),
  restaurantId: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
  password: z.string().min(1, "Password is required."),
});

export const resendVerificationSchema = z.object({
  email: z.email("Enter a valid email address.").trim().toLowerCase(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
