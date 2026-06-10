import type { Server, Socket } from "socket.io";
import { GAME } from "./config/constants.js";
import { publicAttack, RoomState } from "./game/GameState.js";
import { SocketRateLimit } from "./network/rateLimits.js";
import { isGender, readName, readRoomCode, readString } from "./network/validators.js";
import { RoomManager } from "./rooms/RoomManager.js";

interface SocketData {
  playerId?: string;
  roomId?: string;
}

export function attachSocketHandlers(io: Server, rooms: RoomManager): void {
  const rateLimit = new SocketRateLimit();
  const loops = new Map<string, NodeJS.Timeout>();
  const cleanupLoop = setInterval(() => rooms.cleanup(), 60_000);
  cleanupLoop.unref();

  const ensureLoop = (room: RoomState) => {
    if (loops.has(room.id)) return;
    const handle = setInterval(() => {
      if (room.phase !== "game") {
        if (room.phase === "ended") {
          clearInterval(handle);
          loops.delete(room.id);
        }
        return;
      }
      const result = room.tick();
      for (const combat of result.combats) io.to(room.id).emit("workerArrived", combat);
      for (const playerId of result.monsterWarnings) io.to(room.id).emit("monsterWarning", { playerId });
      for (const playerId of result.monsterAttacks) io.to(room.id).emit("monsterAttack", { playerId, damage: GAME.monsterDamage });
      for (const playerId of result.monsterImpacts) io.to(room.id).emit("monsterImpact", { playerId, damage: GAME.monsterDamage });
      if (result.ended) io.to(room.id).emit("gameEnded", result.ended);
      const now = Date.now();
      if (now - room.lastSnapshotAt >= GAME.snapshotMs) {
        room.lastSnapshotAt = now;
        io.to(room.id).emit("gameStateSnapshot", room.snapshot());
      }
      if ((room.phase as string) === "ended") {
        clearInterval(handle);
        loops.delete(room.id);
      }
    }, GAME.gameTickMs);
    loops.set(room.id, handle);
  };

  const joinSocketRoom = (socket: Socket, room: RoomState, playerId: string) => {
    const data = socket.data as SocketData;
    data.playerId = playerId;
    data.roomId = room.id;
    socket.join(room.id);
  };

  const safe = (socket: Socket, fn: () => void) => {
    try {
      fn();
    } catch (error) {
      socket.emit("errorMessage", { code: "bad_request", message: error instanceof Error ? error.message : "Unknown error." });
    }
  };

  io.on("connection", (socket) => {
    socket.on("createRoom", (payload) => safe(socket, () => {
      if (!rateLimit.allow(socket.id, "createRoom", 5, 10_000)) throw new Error("Too many room requests.");
      const name = readName(payload?.name);
      if (!isGender(payload?.gender)) throw new Error("Gender is required.");
      const room = rooms.createRoom();
      const player = room.addPlayer(name, payload.gender, socket.id);
      joinSocketRoom(socket, room, player.id);
      socket.emit("roomCreated", { roomId: room.id, roomCode: room.code, playerId: player.id, reconnectToken: player.reconnectToken, roomState: room.snapshot() });
      io.to(room.id).emit("roomState", room.snapshot());
    }));

    socket.on("joinRoom", (payload) => safe(socket, () => {
      if (!rateLimit.allow(socket.id, "joinRoom", 10, 10_000)) throw new Error("Too many join requests.");
      const code = readRoomCode(payload?.roomCode);
      const name = readName(payload?.name);
      if (!isGender(payload?.gender)) throw new Error("Gender is required.");
      const room = rooms.getByCode(code);
      if (!room) throw new Error("Room not found.");
      const player = room.addPlayer(name, payload.gender, socket.id);
      joinSocketRoom(socket, room, player.id);
      socket.emit("roomJoined", { roomId: room.id, roomCode: room.code, playerId: player.id, reconnectToken: player.reconnectToken, roomState: room.snapshot() });
      io.to(room.id).emit("roomState", room.snapshot());
    }));

    socket.on("reconnectPlayer", (payload) => safe(socket, () => {
      const roomId = readString(payload?.roomId, "Room ID");
      const playerId = readString(payload?.playerId, "Player ID");
      const reconnectToken = readString(payload?.reconnectToken, "Reconnect token");
      const room = rooms.getById(roomId);
      if (!room) throw new Error("Room no longer exists.");
      const player = room.reconnect(playerId, reconnectToken, socket.id);
      joinSocketRoom(socket, room, player.id);
      socket.emit("reconnected", { playerId: player.id, reconnectToken: player.reconnectToken, roomState: room.snapshot() });
      io.to(room.id).emit("playerReconnected", { playerId: player.id });
      io.to(room.id).emit("roomState", room.snapshot());
    }));

    socket.on("setReady", (payload) => safe(socket, () => {
      const data = socket.data as SocketData;
      if (!data.roomId || !data.playerId) throw new Error("Not in a room.");
      const room = rooms.getById(data.roomId);
      if (!room) throw new Error("Room not found.");
      room.setReady(data.playerId, Boolean(payload?.ready));
      io.to(room.id).emit("roomState", room.snapshot());
    }));

    socket.on("startGame", () => safe(socket, () => {
      const data = socket.data as SocketData;
      if (!data.roomId || !data.playerId) throw new Error("Not in a room.");
      const room = rooms.getById(data.roomId);
      if (!room) throw new Error("Room not found.");
      room.start(data.playerId);
      ensureLoop(room);
      io.to(room.id).emit("gameStarted", room.snapshot());
    }));

    socket.on("attackOffice", (payload) => safe(socket, () => {
      if (!rateLimit.allow(socket.id, "attackOffice", 20, 1_000)) throw new Error("Attacking too quickly.");
      const data = socket.data as SocketData;
      if (!data.roomId || !data.playerId) throw new Error("Not in a room.");
      const targetPlayerId = readString(payload?.targetPlayerId, "Target player");
      const room = rooms.getById(data.roomId);
      if (!room) throw new Error("Room not found.");
      const attack = room.createAttack(data.playerId, targetPlayerId);
      io.to(room.id).emit("attackAccepted", publicAttack(attack));
      io.to(room.id).emit("gameStateSnapshot", room.snapshot());
    }));

    socket.on("disconnect", () => {
      const room = rooms.findBySocket(socket.id);
      rateLimit.clearSocket(socket.id);
      if (!room) return;
      const player = room.disconnect(socket.id);
      if (!player) return;
      io.to(room.id).emit("playerDisconnected", { playerId: player.id });
      io.to(room.id).emit("hostChanged", { hostPlayerId: room.hostPlayerId });
      io.to(room.id).emit("roomState", room.snapshot());
    });
  });
}
