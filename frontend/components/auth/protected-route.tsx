"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { canAccessRoute, getRoleRedirect } from "@/lib/auth/roles";
import { useAuth } from "@/hooks/use-auth";
import type { UserRole } from "@/types/auth";

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallbackPath?: string;
  pathname: string;
};

export function ProtectedRoute({
  allowedRoles,
  children,
  fallbackPath = "/login",
  pathname,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { hydrate, loading, user } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace(fallbackPath);
      return;
    }

    const allowed =
      allowedRoles?.includes(user.role) ?? canAccessRoute(user.role, pathname);

    if (!allowed) {
      router.replace(getRoleRedirect(user.role));
    }
  }, [allowedRoles, fallbackPath, loading, pathname, router, user]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <Loader2 className="size-6 animate-spin text-emerald-300" />
      </div>
    );
  }

  return <>{children}</>;
}
