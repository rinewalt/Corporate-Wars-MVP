import test from "node:test";
import assert from "node:assert/strict";
import { GAME } from "../src/config/constants.js";
import { RoomManager } from "../src/rooms/RoomManager.js";

function roomWithPlayers(count: number) {
  const room = new RoomManager().createRoom();
  const players = [];
  for (let i = 0; i < count; i += 1) {
    const p = room.addPlayer(`P${i}`, i % 2 ? "female" : "male", `s${i}`);
    p.ready = true;
    players.push(p);
  }
  room.start(players[0]!.id, 10_000);
  return { room, players };
}

test("worker generation adds one worker per five second step", () => {
  const { room, players } = roomWithPlayers(2);
  room.tick(15_000);
  assert.equal(players[0]!.workers, 11);
  room.tick(25_000);
  assert.equal(players[0]!.workers, 13);
});

test("monster warning and damage trigger on outgoing inactivity and then reset", () => {
  const { room, players } = roomWithPlayers(2);
  const target = players[0]!;
  const warning = room.tick(10_000 + GAME.monsterWarningMs).monsterWarnings;
  assert.deepEqual(warning, players.map((p) => p.id));
  const result = room.tick(10_000 + GAME.monsterAttackMs);
  assert.equal(result.monsterAttacks.includes(target.id), true);
  assert.equal(target.officeHp, 100);
  const impact = room.tick(10_000 + GAME.monsterAttackMs + 2_600);
  assert.equal(impact.monsterImpacts.includes(target.id), true);
  assert.equal(target.officeHp, 80);
  const second = room.tick(10_000 + GAME.monsterAttackMs + 2_601);
  assert.equal(second.monsterAttacks.length, 0);
});

test("simultaneous arrivals resolve deterministically with one final attacker", () => {
  const { room, players } = roomWithPlayers(3);
  const [a, b, c] = players;
  c!.workers = 0;
  c!.officeHp = 2;
  const attackA = room.createAttack(a!.id, c!.id, 20_000);
  const attackB = room.createAttack(b!.id, c!.id, 20_000);
  attackB.arrivalTime = attackA.arrivalTime;
  room.lastWorkerGenerationAt = attackA.arrivalTime;
  room.tick(attackA.arrivalTime);
  assert.equal(c!.eliminated, true);
  assert.equal(a!.eliminations + b!.eliminations, 1);
});

test("end stats include winner and rankings", () => {
  const { room, players } = roomWithPlayers(2);
  room.eliminatePlayer(players[1]!, players[0]!, 30_000);
  const ended = room.checkEnd();
  assert.equal(ended?.winner.id, players[0]!.id);
  assert.equal(ended?.survivalRanking[0]?.id, players[0]!.id);
});
