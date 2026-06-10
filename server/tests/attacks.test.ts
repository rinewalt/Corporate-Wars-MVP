import test from "node:test";
import assert from "node:assert/strict";
import { RoomManager } from "../src/rooms/RoomManager.js";

function startedRoom() {
  const room = new RoomManager().createRoom();
  const a = room.addPlayer("A", "male", "a");
  const b = room.addPlayer("B", "female", "b");
  room.setReady(a.id, true);
  room.setReady(b.id, true);
  room.start(a.id, 1_000);
  return { room, a, b };
}

test("attack decrements one worker and captures attack power", () => {
  const { room, a, b } = startedRoom();
  a.workerAttack = 2.25;
  const attack = room.createAttack(a.id, b.id, 2_000);
  assert.equal(a.workers, 9);
  assert.equal(a.workersSent, 1);
  assert.equal(attack.attackPower, 2.25);
  assert.equal(attack.arrivalTime > attack.startTime, true);
});

test("defenders absorb attacks one-for-one", () => {
  const { room, a, b } = startedRoom();
  b.workers = 1;
  const attack = room.createAttack(a.id, b.id, 2_000);
  room.lastWorkerGenerationAt = attack.arrivalTime;
  room.tick(attack.arrivalTime);
  assert.equal(b.workers, 0);
  assert.equal(b.officeHp, 100);
  assert.equal(b.defendedCount, 1);
});

test("remaining attacker damages office and final attacker gets reward", () => {
  const { room, a, b } = startedRoom();
  b.workers = 0;
  b.officeHp = 2;
  const attack = room.createAttack(a.id, b.id, 2_000);
  room.lastWorkerGenerationAt = attack.arrivalTime;
  room.tick(attack.arrivalTime);
  assert.equal(b.eliminated, true);
  assert.equal(a.eliminations, 1);
  assert.equal(a.workerAttack, 2.25);
});

test("attacks to eliminated offices disappear without refund", () => {
  const { room, a, b } = startedRoom();
  const attack = room.createAttack(a.id, b.id, 2_000);
  b.eliminated = true;
  const before = a.workers;
  room.lastWorkerGenerationAt = attack.arrivalTime;
  room.tick(attack.arrivalTime);
  assert.equal(a.workers, before);
  assert.equal(room.attacks.size, 0);
});

test("invalid attacks are rejected", () => {
  const { room, a, b } = startedRoom();
  assert.throws(() => room.createAttack(a.id, a.id), /own office/);
  a.workers = 0;
  assert.throws(() => room.createAttack(a.id, b.id), /No workers/);
});
