import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Register",
  description: "Create a DineFlow account.",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
