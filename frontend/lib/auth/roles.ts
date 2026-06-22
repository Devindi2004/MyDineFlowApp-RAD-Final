import type { UserRole } from "@/types/auth";

export function getRoleRedirect(role: UserRole) {
  if (role === "admin") {
    return "/admin/dashboard";
  }

  if (role === "waiter") {
    return "/waiter/dashboard";
  }

  if (role === "chef" || role === "kitchen") {
    return "/kitchen/dashboard";
  }

  return "/customer/menu";
}

export function canAccessRoute(role: UserRole, pathname: string) {
  if (pathname.startsWith("/admin")) {
    return role === "admin";
  }

  if (pathname.startsWith("/kitchen")) {
    return (
      role === "admin" ||
      role === "chef" ||
      role === "kitchen"
    );
  }

  if (pathname.startsWith("/waiter")) {
    return role === "admin" || role === "waiter";
  }

  if (
    pathname.startsWith("/customer") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/tracking")
  ) {
    return role === "customer";
  }

  return true;
}
