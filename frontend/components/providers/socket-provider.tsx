"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken, getPersistedAuthUser } from "@/lib/api";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/realtime";

type DineFlowSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

type SocketContextValue = {
  connected: boolean;
  socket: DineFlowSocket | null;
};

const SocketContext = createContext<SocketContextValue>({
  connected: false,
  socket: null,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<DineFlowSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SOCKET_URL;

    if (!url) {
      return;
    }

    const instance: DineFlowSocket = io(url, {
      auth: {
        token: getAccessToken(),
      },
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
    });

    instance.io.on("reconnect_attempt", () => {
      instance.auth = { token: getAccessToken() };
    });
    instance.on("connect", () => {
      setConnected(true);
      const user = getPersistedAuthUser();
      if (user?.role) {
        instance.emit("join-role", user.role);
      }
    });
    instance.on("disconnect", () => setConnected(false));
    instance.on("connect_error", () => setConnected(false));

    const socketFrame = window.requestAnimationFrame(() => {
      setSocket(instance);
    });

    return () => {
      window.cancelAnimationFrame(socketFrame);
      instance.disconnect();
      setSocket(null);
    };
  }, []);

  const value = useMemo(() => ({ connected, socket }), [connected, socket]);

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
