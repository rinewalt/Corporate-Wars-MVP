import { GAME } from "../config/constants.js";
import { RoomState } from "../game/GameState.js";
import { id, roomCode } from "../utils/ids.js";

export class RoomManager {
  private roomsById = new Map<string, RoomState>();
  private roomsByCode = new Map<string, RoomState>();

  createRoom(): RoomState {
    const existingCodes = new Set(this.roomsByCode.keys());
    const room = new RoomState(id("room"), roomCode(existingCodes));
    this.roomsById.set(room.id, room);
    this.roomsByCode.set(room.code, room);
    return room;
  }

  getById(roomId: string): RoomState | undefined {
    return this.roomsById.get(roomId);
  }

  getByCode(code: string): RoomState | undefined {
    return this.roomsByCode.get(code.trim().toUpperCase());
  }

  roomCodes(): string[] {
    return [...this.roomsByCode.keys()];
  }

  findBySocket(socketId: string): RoomState | undefined {
    for (const room of this.roomsById.values()) {
      if ([...room.players.values()].some((player) => player.socketId === socketId)) return room;
    }
    return undefined;
  }

  all(): RoomState[] {
    return [...this.roomsById.values()];
  }

  cleanup(now = Date.now()): number {
    let removed = 0;
    for (const room of this.roomsById.values()) {
      const allDisconnected = [...room.players.values()].every((player) => !player.connected);
      const shouldRemove =
        (room.phase === "lobby" && now - room.createdAt > GAME.lobbyTtlMs) ||
        (room.phase === "ended" && now - room.endedAt > GAME.endedRoomTtlMs) ||
        (allDisconnected && now - Math.max(room.createdAt, room.gameStartedAt || 0, room.endedAt || 0) > GAME.disconnectedRoomTtlMs);
      if (shouldRemove) {
        this.roomsById.delete(room.id);
        this.roomsByCode.delete(room.code);
        removed += 1;
      }
    }
    return removed;
  }
}
