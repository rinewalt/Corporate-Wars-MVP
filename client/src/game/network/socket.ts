import { io, Socket } from "socket.io-client";

const configuredServerUrl = import.meta.env.VITE_SERVER_URL as string | undefined;
const localServerUrl = "http://127.0.0.1:3001";

export const SERVER_URL = configuredServerUrl?.trim() || (import.meta.env.DEV ? localServerUrl : window.location.origin);

let socket: Socket | undefined;

export function getSocket(): Socket {
  if (!socket) {
    console.info("[socket] initializing client", {
      serverUrl: SERVER_URL,
      hasViteServerUrl: Boolean(configuredServerUrl?.trim()),
      mode: import.meta.env.MODE
    });
    if (!configuredServerUrl?.trim() && !import.meta.env.DEV) {
      console.warn("[socket] VITE_SERVER_URL is not configured; falling back to current origin.");
    }
    socket = io(SERVER_URL, {
      autoConnect: true,
      reconnectionAttempts: 8,
      timeout: 6_000
    });
    socket.on("connect", () => {
      console.info("[socket] connected", {
        socketId: socket?.id,
        serverUrl: SERVER_URL,
        transport: socket?.io.engine.transport.name
      });
    });
    socket.on("connect_error", (error: Error) => {
      console.error("[socket] connection error", {
        serverUrl: SERVER_URL,
        message: error.message
      });
    });
    socket.on("disconnect", (reason: string) => {
      console.warn("[socket] disconnected", { reason });
    });
  }
  return socket;
}
