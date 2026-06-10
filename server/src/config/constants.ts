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
  { x: 585.71, y: 377.86 },
  { x: 900, y: 377.86 },
  { x: 1198.57, y: 377.86 },
  { x: 424.64, y: 491.79 },
  { x: 1379.29, y: 491.79 },
  { x: 397.14, y: 660.71 },
  { x: 1402.86, y: 660.71 },
  { x: 405, y: 861.07 },
  { x: 1398.93, y: 861.07 },
  { x: 416.79, y: 1061.43 },
  { x: 680, y: 1104.64 },
  { x: 900, y: 1104.64 },
  { x: 1159.29, y: 1104.64 },
  { x: 1387.14, y: 1061.43 }
] as const;
