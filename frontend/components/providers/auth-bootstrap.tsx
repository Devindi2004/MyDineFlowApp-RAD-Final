"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/hooks/use-auth";

export function AuthBootstrap() {
  const hydrate = useAuthStore((state) => state.hydrate);
  const hydrated = useAuthStore((state) => state.hydrated);

  useEffect(() => {
    if (!hydrated) {
      hydrate();
    }
  }, [hydrate, hydrated]);

  return null;
}
