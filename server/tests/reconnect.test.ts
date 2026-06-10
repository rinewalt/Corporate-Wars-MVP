import test from "node:test";
import assert from "node:assert/strict";
import { RoomManager } from "../src/rooms/RoomManager.js";

test("ready state is preserved across reconnect", () => {
  const room = new RoomManager().createRoom();
  const player = room.addPlayer("Ready", "male", "old");
  room.setReady(player.id, true);
  room.disconnect("old");
  room.reconnect(player.id, player.reconnectToken, "new");
  assert.equal(player.ready, true);
});

test("disconnect leaves office active and generating workers", () => {
  const room = new RoomManager().createRoom();
  const a = room.addPlayer("A", "male", "a");
  const b = room.addPlayer("B", "female", "b");
  a.ready = true;
  b.ready = true;
  room.start(a.id, 1_000);
  room.disconnect("b");
  room.tick(6_000);
  assert.equal(b.connected, false);
  assert.equal(b.eliminated, false);
  assert.equal(b.workers, 11);
});
