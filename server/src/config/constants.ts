export const GAME = {
  maxPlayers: 14,
  minPlayers: 2,
  startingHp: 100,
  startingWorkers: 10,
  startingWorkerAttack: 2,
  workerHp: 10,
  workerGenerationMs: 5_000,
  maxActiveMarchingWorkers: 100,
  closestTravelMs: 3_000,
  furthestTravelMs: 10_000,
  monsterWarningMs: 25_000,
  monsterAttackMs: 30_000,
  monsterDamage: 20,
  attackBonus: 0.25,
  roomCodeLength: 5,
  gameTickMs: 100,
  snapshotMs: 200,
  lobbyTtlMs: 30 * 60_000,
  endedRoomTtlMs: 10 * 60_000,
  disconnectedRoomTtlMs: 10 * 60_000
} as const;

export const OFFICE_SLOTS = [
  { x: 516, y: 269.5 },
  { x: 900, y: 269.5 },
  { x: 1284, y: 269.5 },
  { x: 288, y: 405.5 },
  { x: 1512, y: 405.5 },
  { x: 208, y: 593.5 },
  { x: 1592, y: 593.5 },
  { x: 208, y: 806.5 },
  { x: 1592, y: 806.5 },
  { x: 258, y: 1038.5 },
  { x: 578, y: 1108.5 },
  { x: 900, y: 1134.5 },
  { x: 1222, y: 1108.5 },
  { x: 1542, y: 1038.5 }
] as const;
