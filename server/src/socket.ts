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

function logInfo(message: string, details: Record<string, unknown> = {}): void {
  console.info(`[socket] ${message}`, details);
}

function logWarn(message: string, details: Record<string, unknown> = {}): void {
  console.warn(`[socket] ${message}`, details);
}

function payloadSummary(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== "object") return { payloadType: typeof payload };
  const data = payload as Record<string, unknown>;
  return {
    hasName: typeof data.name === "string" && data.name.trim().length > 0,
    nameLength: typeof data.name === "string" ? data.name.trim().length : undefined,
    gender: typeof data.gender === "string" ? data.gender : undefined,
    roomCode: typeof data.roomCode === "string" ? data.roomCode.trim().toUpperCase() : undefined,
    hasReady: typeof data.ready === "boolean"
  };
}

function payloadRecord(payload: unknown): Record<string, unknown> {
  return payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
}

function normalizeRoomCodeForLog(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim().toUpperCase() : undefined;
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

  const safe = (socket: Socket, eventName: string, fn: () => void) => {
    try {
      fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      logWarn("validation failure", {
        eventName,
        socketId: socket.id,
        roomId: (socket.data as SocketData).roomId,
        playerId: (socket.data as SocketData).playerId,
        message
      });
      socket.emit("errorMessage", { code: "bad_request", message });
    }
  };

  io.on("connection", (socket) => {
    logInfo("socket connection", {
      socketId: socket.id,
      origin: socket.handshake.headers.origin,
      transport: socket.conn.transport.name
    });

    socket.on("createRoom", (payload: unknown) => safe(socket, "createRoom", () => {
      const request = payloadRecord(payload);
      logInfo("create room event", { socketId: socket.id, ...payloadSummary(payload) });
      if (!rateLimit.allow(socket.id, "createRoom", 5, 10_000)) throw new Error("Too many room requests.");
      const name = readName(request.name);
      const gender = request.gender;
      if (!isGender(gender)) throw new Error("Gender is required.");
      const room = rooms.createRoom();
      const player = room.addPlayer(name, gender, socket.id);
      joinSocketRoom(socket, room, player.id);
      logInfo("room created", { socketId: socket.id, roomId: room.id, roomCode: room.code, playerId: player.id, existingRoomCodes: rooms.roomCodes() });
      socket.emit("roomCreated", { roomId: room.id, roomCode: room.code, playerId: player.id, reconnectToken: player.reconnectToken, roomState: room.snapshot() });
      io.to(room.id).emit("roomState", room.snapshot());
    }));

    socket.on("joinRoom", (payload: unknown) => safe(socket, "joinRoom", () => {
      const request = payloadRecord(payload);
      const receivedRoomCode = typeof request.roomCode === "string" ? request.roomCode : undefined;
      const normalizedRoomCode = normalizeRoomCodeForLog(request.roomCode);
      logInfo("join room event", {
        socketId: socket.id,
        roomCodeReceived: receivedRoomCode,
        normalizedRoomCode,
        playerName: typeof request.name === "string" ? request.name.trim() : undefined,
        gender: typeof request.gender === "string" ? request.gender : undefined,
        ...payloadSummary(payload)
      });
      if (!rateLimit.allow(socket.id, "joinRoom", 10, 10_000)) throw new Error("Too many join requests.");
      const code = readRoomCode(request.roomCode);
      const name = readName(request.name);
      const gender = request.gender;
      if (!isGender(gender)) throw new Error("Gender is required.");
      const existingRoomCodes = rooms.roomCodes();
      logInfo("join room lookup starting", { socketId: socket.id, normalizedRoomCode: code, existingRoomCodes });
      const room = rooms.getByCode(code);
      logInfo("join room lookup result", {
        socketId: socket.id,
        normalizedRoomCode: code,
        roomExists: Boolean(room),
        roomId: room?.id,
        roomPhase: room?.phase,
        playerCount: room?.players.size
      });
      if (!room) {
        logWarn("room not found", { socketId: socket.id, roomCode: code });
        throw new Error("Room not found");
      }
      if (room.phase !== "lobby") throw new Error("Room already started");
      if (room.players.size >= GAME.maxPlayers) throw new Error("Room full");
      const player = room.addPlayer(name, gender, socket.id);
      joinSocketRoom(socket, room, player.id);
      logInfo("room joined", { socketId: socket.id, roomId: room.id, roomCode: room.code, playerId: player.id, players: room.players.size });
      socket.emit("roomJoined", { roomId: room.id, roomCode: room.code, playerId: player.id, reconnectToken: player.reconnectToken, roomState: room.snapshot() });
      io.to(room.id).emit("roomState", room.snapshot());
    }));

    socket.on("reconnectPlayer", (payload: unknown) => safe(socket, "reconnectPlayer", () => {
      const request = payloadRecord(payload);
      const roomId = readString(request.roomId, "Room ID");
      const playerId = readString(request.playerId, "Player ID");
      const reconnectToken = readString(request.reconnectToken, "Reconnect token");
      const room = rooms.getById(roomId);
      if (!room) throw new Error("Room no longer exists.");
      const player = room.reconnect(playerId, reconnectToken, socket.id);
      joinSocketRoom(socket, room, player.id);
      socket.emit("reconnected", { playerId: player.id, reconnectToken: player.reconnectToken, roomState: room.snapshot() });
      io.to(room.id).emit("playerReconnected", { playerId: player.id });
      io.to(room.id).emit("roomState", room.snapshot());
    }));

    socket.on("setReady", (payload: unknown) => safe(socket, "setReady", () => {
      const request = payloadRecord(payload);
      logInfo("ready event", { socketId: socket.id, ...payloadSummary(payload) });
      const data = socket.data as SocketData;
      if (!data.roomId || !data.playerId) throw new Error("Not in a room.");
      const room = rooms.getById(data.roomId);
      if (!room) throw new Error("Room not found.");
      room.setReady(data.playerId, Boolean(request.ready));
      io.to(room.id).emit("roomState", room.snapshot());
    }));

    socket.on("startGame", () => safe(socket, "startGame", () => {
      logInfo("start game event", { socketId: socket.id });
      const data = socket.data as SocketData;
      if (!data.roomId || !data.playerId) throw new Error("Not in a room.");
      const room = rooms.getById(data.roomId);
      if (!room) throw new Error("Room not found.");
      room.start(data.playerId);
      ensureLoop(room);
      io.to(room.id).emit("gameStarted", room.snapshot());
    }));

    socket.on("attackOffice", (payload: unknown) => safe(socket, "attackOffice", () => {
      const request = payloadRecord(payload);
      if (!rateLimit.allow(socket.id, "attackOffice", 20, 1_000)) throw new Error("Attacking too quickly.");
      const data = socket.data as SocketData;
      if (!data.roomId || !data.playerId) throw new Error("Not in a room.");
      const targetPlayerId = readString(request.targetPlayerId, "Target player");
      const room = rooms.getById(data.roomId);
      if (!room) throw new Error("Room not found.");
      const attack = room.createAttack(data.playerId, targetPlayerId);
      io.to(room.id).emit("attackAccepted", publicAttack(attack));
      io.to(room.id).emit("gameStateSnapshot", room.snapshot());
    }));

    socket.on("leaveRoom", () => safe(socket, "leaveRoom", () => {
      const data = socket.data as SocketData;
      if (!data.roomId || !data.playerId) {
        socket.emit("leftRoom");
        return;
      }
      const room = rooms.getById(data.roomId);
      if (!room) {
        delete data.roomId;
        delete data.playerId;
        socket.emit("leftRoom");
        return;
      }
      const leavingPlayerId = data.playerId;
      logInfo("leave room event", { socketId: socket.id, roomId: room.id, playerId: leavingPlayerId, phase: room.phase });
      if (room.phase === "lobby") {
        const removed = room.removeLobbyPlayer(leavingPlayerId);
        socket.leave(room.id);
        delete data.roomId;
        delete data.playerId;
        socket.emit("leftRoom");
        if (room.players.size === 0) {
          rooms.removeRoom(room);
          logInfo("empty room removed after leave", { roomId: room.id, roomCode: room.code });
          return;
        }
        if (removed) {
          io.to(room.id).emit("hostChanged", { hostPlayerId: room.hostPlayerId });
          io.to(room.id).emit("roomState", room.snapshot());
        }
        return;
      }
      const player = room.disconnect(socket.id);
      socket.leave(room.id);
      delete data.roomId;
      delete data.playerId;
      socket.emit("leftRoom");
      if (!player) return;
      io.to(room.id).emit("playerDisconnected", { playerId: player.id });
      io.to(room.id).emit("hostChanged", { hostPlayerId: room.hostPlayerId });
      io.to(room.id).emit("roomState", room.snapshot());
    }));

    socket.on("disconnect", () => {
      const room = rooms.findBySocket(socket.id);
      rateLimit.clearSocket(socket.id);
      if (!room) {
        logInfo("socket disconnect", { socketId: socket.id });
        return;
      }
      const player = room.disconnect(socket.id);
      logInfo("socket disconnect", { socketId: socket.id, roomId: room.id, playerId: player?.id });
      if (!player) return;
      io.to(room.id).emit("playerDisconnected", { playerId: player.id });
      io.to(room.id).emit("hostChanged", { hostPlayerId: room.hostPlayerId });
      io.to(room.id).emit("roomState", room.snapshot());
    });
  });
}
