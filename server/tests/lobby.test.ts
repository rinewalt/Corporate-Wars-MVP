import test from "node:test";
import assert from "node:assert/strict";
import { GAME } from "../src/config/constants.js";
import { RoomManager } from "../src/rooms/RoomManager.js";

test("players can join up to the blueprint office limit and the next join is rejected", () => {
  const manager = new RoomManager();
  const room = manager.createRoom();
  for (let i = 0; i < GAME.maxPlayers; i += 1) {
    room.addPlayer(`Player${i}`, i % 2 === 0 ? "male" : "female", `socket${i}`);
  }
  assert.equal(room.players.size, GAME.maxPlayers);
  assert.throws(() => room.addPlayer("Overflow", "male", "socket-overflow"), /Room is full/);
});

test("ready system and host start validation work", () => {
  const room = new RoomManager().createRoom();
  const host = room.addPlayer("Host", "male", "socket-a");
  const guest = room.addPlayer("Guest", "female", "socket-b");
  room.setReady(host.id, true);
  assert.equal(room.canStart(host.id), false);
  room.setReady(guest.id, true);
  assert.equal(room.canStart(host.id), true);
  room.start(host.id, 1_000);
  assert.equal(room.phase, "game");
});

test("host transfer selects a connected replacement", () => {
  const room = new RoomManager().createRoom();
  const host = room.addPlayer("Host", "male", "socket-a");
  const guest = room.addPlayer("Guest", "female", "socket-b");
  room.disconnect("socket-a");
  assert.equal(room.hostPlayerId, guest.id);
  assert.equal(room.requirePlayer(host.id).isHost, false);
  assert.equal(room.requirePlayer(guest.id).isHost, true);
});

test("joining player becomes host when previous host is already offline", () => {
  const room = new RoomManager().createRoom();
  const host = room.addPlayer("Host", "male", "socket-a");
  room.disconnect("socket-a");
  const guest = room.addPlayer("Guest", "female", "socket-b");
  assert.equal(room.requirePlayer(host.id).isHost, false);
  assert.equal(room.requirePlayer(guest.id).isHost, true);
  assert.equal(room.hostPlayerId, guest.id);
});

test("reconnect restores the same player without duplicate join", () => {
  const room = new RoomManager().createRoom();
  const player = room.addPlayer("Refresh", "female", "old-socket");
  room.disconnect("old-socket");
  const restored = room.reconnect(player.id, player.reconnectToken, "new-socket");
  assert.equal(restored.id, player.id);
  assert.equal(restored.connected, true);
  assert.equal(room.players.size, 1);
});
