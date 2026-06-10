import { io, Socket } from "socket.io-client";

const configuredServerUrl = import.meta.env.VITE_SERVER_URL as string | undefined;
const localServerUrl = "http://127.0.0.1:3001";

export const SERVER_URL = configuredServerUrl?.trim() || (import.meta.env.DEV ? localServerUrl : "");
export const SOCKET_SETUP_ERROR = SERVER_URL ? "" : "VITE_SERVER_URL is not configured.";

let socket: Socket | undefined;

export function getSocket(): Socket {
  if (!socket) {
    console.info("[socket] initializing client", {
      serverUrl: SERVER_URL,
      hasViteServerUrl: Boolean(configuredServerUrl?.trim()),
      mode: import.meta.env.MODE
    });
    if (SOCKET_SETUP_ERROR) {
      console.error("[socket] setup error", { message: SOCKET_SETUP_ERROR });
    }
    socket = io(SERVER_URL || "https://missing-vite-server-url.invalid", {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
      timeout: 30_000,
      transports: ["websocket", "polling"]
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

export function connectSocket(): Socket {
  const activeSocket = getSocket();
  if (SERVER_URL && !activeSocket.connected && !activeSocket.active) activeSocket.connect();
  return activeSocket;
}

export function resetSocket(): Socket {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = undefined;
  }
  return getSocket();
}

export async function wakeServer(timeoutMs = 12_000): Promise<void> {
  if (!SERVER_URL) throw new Error(SOCKET_SETUP_ERROR);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${SERVER_URL}/health`, {
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
  } finally {
    window.clearTimeout(timeout);
  }
}
