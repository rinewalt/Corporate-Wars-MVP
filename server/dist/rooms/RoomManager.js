import { GAME } from "../config/constants.js";
import { RoomState } from "../game/GameState.js";
import { id, roomCode } from "../utils/ids.js";
export class RoomManager {
    roomsById = new Map();
    roomsByCode = new Map();
    createRoom() {
        const existingCodes = new Set(this.roomsByCode.keys());
        const room = new RoomState(id("room"), roomCode(existingCodes));
        this.roomsById.set(room.id, room);
        this.roomsByCode.set(room.code, room);
        return room;
    }
    getById(roomId) {
        return this.roomsById.get(roomId);
    }
    getByCode(code) {
        return this.roomsByCode.get(code.trim().toUpperCase());
    }
    findBySocket(socketId) {
        for (const room of this.roomsById.values()) {
            if ([...room.players.values()].some((player) => player.socketId === socketId))
                return room;
        }
        return undefined;
    }
    all() {
        return [...this.roomsById.values()];
    }
    cleanup(now = Date.now()) {
        let removed = 0;
        for (const room of this.roomsById.values()) {
            const allDisconnected = [...room.players.values()].every((player) => !player.connected);
            const shouldRemove = (room.phase === "lobby" && now - room.createdAt > GAME.lobbyTtlMs) ||
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
