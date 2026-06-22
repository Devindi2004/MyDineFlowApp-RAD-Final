"use client";

import { QueryProvider } from "@/components/providers/query-provider";
import { ReduxProvider } from "@/components/providers/redux-provider";
import { SocketProvider } from "@/components/providers/socket-provider";
import { AuthBootstrap } from "@/components/providers/auth-bootstrap";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <QueryProvider>
        <SocketProvider>
          <AuthBootstrap />
          {children}
        </SocketProvider>
      </QueryProvider>
    </ReduxProvider>
  );
}
