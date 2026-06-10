import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { attachSocketHandlers } from "./socket.js";
import { RoomManager } from "./rooms/RoomManager.js";

export function createApp() {
  const app = express();
  const clientOrigin = process.env.CLIENT_ORIGIN ?? "*";
  app.use(cors({ origin: clientOrigin }));
  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "corporate-wars-server" });
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: clientOrigin, methods: ["GET", "POST"] }
  });
  const rooms = new RoomManager();
  attachSocketHandlers(io, rooms);
  return { app, httpServer, io, rooms };
}
