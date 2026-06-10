import test from "node:test";
import assert from "node:assert/strict";
import { GAME } from "../src/config/constants.js";
import { RoomManager } from "../src/rooms/RoomManager.js";

test("stress: max blueprint players, continuous attacks, disconnects, reconnects", () => {
  const room = new RoomManager().createRoom();
  const players = [];
  for (let i = 0; i < GAME.maxPlayers; i += 1) {
    const player = room.addPlayer(`P${i}`, i % 2 ? "female" : "male", `socket-${i}`);
    player.ready = true;
    player.workers = 120;
    players.push(player);
  }
  room.start(players[0]!.id, 1_000);
  for (let step = 0; step < 300; step += 1) {
    const now = 2_000 + step * 250;
    const attacker = players[step % players.length]!;
    const target = players[(step + 1) % players.length]!;
    if (!attacker.eliminated && !target.eliminated) {
      try {
        room.createAttack(attacker.id, target.id, now);
      } catch {
        // Rate-like caps are acceptable under stress.
      }
    }
    if (step === 35) room.disconnect("socket-5");
    if (step === 55) room.reconnect(players[5]!.id, players[5]!.reconnectToken, "socket-5b");
    room.tick(now + 10_000);
    for (const player of players) {
      assert.equal(player.workers >= 0, true);
      assert.equal(player.officeHp >= 0, true);
    }
    if (room.phase === "ended") break;
  }
  assert.equal(room.players.size, GAME.maxPlayers);
});
